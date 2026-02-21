import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(InAppPurchasePlugin)
public class InAppPurchasePlugin: CAPPlugin {

    private var productCache: [String: Product] = [:]
    private let cacheLock = NSLock()
    private var transactionListenerTask: Task<Void, Never>?

    private static let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        return formatter
    }()

    // MARK: - Plugin Lifecycle

    override public func load() {
        super.load()
        setupTransactionListener()
    }

    deinit {
        transactionListenerTask?.cancel()
    }

    // MARK: - Thread-Safe Cache Access

    private func getCachedProduct(_ id: String) -> Product? {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        return productCache[id]
    }

    private func cacheProduct(_ product: Product) {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        productCache[product.id] = product
    }

    // MARK: - Exported Methods

    @objc func initialize(_ call: CAPPluginCall) {
        Task {
            do {
                // Sync with App Store
                try await AppStore.sync()
                DispatchQueue.main.async {
                    call.resolve()
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Failed to initialize StoreKit: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds array")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))

                // Sort to match requested order
                let sortedProducts = productIds.compactMap { id in
                    products.first { $0.id == id }
                }

                // Cache products for later use (thread-safe)
                for product in sortedProducts {
                    self.cacheProduct(product)
                }

                let result: [[String: Any]] = sortedProducts.map { product in
                    var info: [String: Any] = [
                        "productId": product.id,
                        "localizedPrice": product.displayPrice,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "displayName": product.displayName,
                        "description": product.description
                    ]

                    // Add subscription info if available
                    if let subscription = product.subscription {
                        info["subscriptionPeriod"] = [
                            "unit": String(describing: subscription.subscriptionPeriod.unit),
                            "value": subscription.subscriptionPeriod.value
                        ]
                        if let introOffer = subscription.introductoryOffer {
                            info["introductoryOffer"] = [
                                "type": String(describing: introOffer.type),
                                "period": [
                                    "unit": String(describing: introOffer.period.unit),
                                    "value": introOffer.period.value
                                ],
                                "displayPrice": introOffer.displayPrice
                            ]
                        }
                    }

                    return info
                }

                DispatchQueue.main.async {
                    call.resolve(["products": result])
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Failed to fetch products: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        Task {
            var result: [[String: Any]] = []

            for await verificationResult in Transaction.currentEntitlements {
                // Only process verified transactions
                guard case .verified(let transaction) = verificationResult else {
                    continue
                }

                // Only include premium products
                guard transaction.productID.contains("premium") else {
                    continue
                }

                let isActive = transaction.revocationDate == nil && !transaction.isUpgraded

                var entry: [String: Any] = [
                    "productId": transaction.productID,
                    "isActive": isActive,
                    "isTrialPeriod": transaction.offerType == .introductory,
                    "willAutoRenew": !transaction.isUpgraded,
                    "transactionId": String(transaction.id),
                    "originalTransactionId": String(transaction.originalID),
                    "purchaseDate": Self.dateFormatter.string(from: transaction.purchaseDate)
                ]

                if let expirationDate = transaction.expirationDate {
                    entry["expirationDate"] = Self.dateFormatter.string(from: expirationDate)
                }

                result.append(entry)
            }

            DispatchQueue.main.async {
                call.resolve(["entitlements": result])
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        Task {
            do {
                // Get the product from cache or fetch it
                let product: Product
                if let cached = self.getCachedProduct(productId) {
                    product = cached
                } else {
                    let products = try await Product.products(for: [productId])
                    guard let fetchedProduct = products.first else {
                        DispatchQueue.main.async {
                            call.reject("Product not found: \(productId)")
                        }
                        return
                    }
                    product = fetchedProduct
                    self.cacheProduct(product)
                }

                // Perform the purchase
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    // Check verification
                    switch verification {
                    case .verified(let transaction):
                        // Verified purchase — finalize it
                        await transaction.finish()

                        var response: [String: Any] = [
                            "transactionState": "purchased",
                            "productId": productId,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "isTrialPeriod": transaction.offerType == .introductory,
                            "price": NSDecimalNumber(decimal: product.price).doubleValue,
                            "purchaseDate": Self.dateFormatter.string(from: transaction.purchaseDate),
                            "receipt": verification.jwsRepresentation
                        ]

                        if let expirationDate = transaction.expirationDate {
                            response["expirationDate"] = Self.dateFormatter.string(from: expirationDate)
                        }

                        DispatchQueue.main.async {
                            call.resolve(response)
                        }

                    case .unverified(_, let verificationError):
                        // Unverified — reject for security
                        DispatchQueue.main.async {
                            call.reject("Transaction verification failed: \(verificationError.localizedDescription)")
                        }
                    }

                case .userCancelled:
                    DispatchQueue.main.async {
                        call.resolve([
                            "transactionState": "cancelled",
                            "productId": productId
                        ])
                    }

                case .pending:
                    DispatchQueue.main.async {
                        call.resolve([
                            "transactionState": "pending",
                            "productId": productId
                        ])
                    }

                @unknown default:
                    DispatchQueue.main.async {
                        call.resolve([
                            "transactionState": "unknown",
                            "productId": productId
                        ])
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    if let storeError = error as? StoreKitError {
                        switch storeError {
                        case .networkError(_):
                            call.reject("Network error during purchase")
                        case .notAvailableInStorefront:
                            call.reject("This product is not available in your region")
                        case .userCancelled:
                            call.resolve([
                                "transactionState": "cancelled",
                                "productId": productId
                            ])
                        default:
                            call.reject("Purchase failed: \(error.localizedDescription)")
                        }
                    } else {
                        call.reject("Purchase failed: \(error.localizedDescription)")
                    }
                }
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                DispatchQueue.main.async {
                    call.resolve()
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Failed to restore purchases: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
                    call.reject("Could not find window scene")
                    return
                }

                try await AppStore.showManageSubscriptions(in: windowScene)
                call.resolve()
            } catch {
                // User may have closed — not necessarily an error
                call.resolve()
            }
        }
    }

    // MARK: - Transaction Listener

    private func setupTransactionListener() {
        transactionListenerTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }

                // Only process verified transactions
                guard case .verified(let transaction) = result else {
                    continue
                }

                // Finish the transaction
                await transaction.finish()

                // Notify JavaScript side
                await self.notifyTransactionUpdate(transaction)
            }
        }
    }

    private func notifyTransactionUpdate(_ transaction: Transaction) async {
        let isActive = transaction.revocationDate == nil && !transaction.isUpgraded

        var transactionState = "purchased"
        if transaction.revocationDate != nil {
            transactionState = "revoked"
        } else if transaction.isUpgraded {
            transactionState = "upgraded"
        }

        var data: [String: Any] = [
            "transactionState": transactionState,
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "isActive": isActive,
            "isTrialPeriod": transaction.offerType == .introductory,
            "price": getCachedProduct(transaction.productID).map { NSDecimalNumber(decimal: $0.price).doubleValue } ?? 0,
            "purchaseDate": Self.dateFormatter.string(from: transaction.purchaseDate)
        ]

        if let expirationDate = transaction.expirationDate {
            data["expirationDate"] = Self.dateFormatter.string(from: expirationDate)
        }

        notifyListeners("transactionUpdate", data: data)
    }
}
