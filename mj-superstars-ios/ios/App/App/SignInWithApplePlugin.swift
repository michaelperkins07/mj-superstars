import Foundation
import Capacitor
import AuthenticationServices

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private var pendingCall: CAPPluginCall?

    // MARK: - Authorize

    @objc func authorize(_ call: CAPPluginCall) {
        pendingCall = call

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self

        DispatchQueue.main.async {
            authorizationController.performRequests()
        }
    }

    // MARK: - Presentation Context

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // First try the bridge's webView window (most reliable)
        if let window = self.bridge?.webView?.window {
            return window
        }

        // Fallback: find the active window through UIScene API (required on iPad)
        if #available(iOS 15.0, *) {
            if let windowScene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }),
               let window = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first {
                return window
            }
        }

        // Last resort: try deprecated but functional approach
        if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
            return window
        }

        return UIWindow()
    }

    // MARK: - ASAuthorizationControllerDelegate

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }

        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            var response: [String: Any] = [:]

            // Identity token (JWT)
            if let identityTokenData = appleIDCredential.identityToken,
               let identityToken = String(data: identityTokenData, encoding: .utf8) {
                response["identityToken"] = identityToken
            }

            // Authorization code
            if let authCodeData = appleIDCredential.authorizationCode,
               let authorizationCode = String(data: authCodeData, encoding: .utf8) {
                response["authorizationCode"] = authorizationCode
            }

            // User identifier
            response["user"] = appleIDCredential.user

            // Email (only on first sign-in)
            if let email = appleIDCredential.email {
                response["email"] = email
            }

            // Full name (only on first sign-in)
            if let fullName = appleIDCredential.fullName {
                var nameComponents: [String: String] = [:]
                if let givenName = fullName.givenName {
                    nameComponents["givenName"] = givenName
                }
                if let familyName = fullName.familyName {
                    nameComponents["familyName"] = familyName
                }
                if !nameComponents.isEmpty {
                    response["fullName"] = nameComponents
                }
            }

            // Real user status
            switch appleIDCredential.realUserStatus {
            case .likelyReal:
                response["realUserStatus"] = "likelyReal"
            case .unknown:
                response["realUserStatus"] = "unknown"
            case .unsupported:
                response["realUserStatus"] = "unsupported"
            @unknown default:
                response["realUserStatus"] = "unknown"
            }

            call.resolve(["response": response])
        } else {
            call.reject("Unexpected credential type")
        }

        pendingCall = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }

        let authError = error as? ASAuthorizationError
        let errorCode = authError?.code ?? .unknown

        switch errorCode {
        case .canceled:
            call.reject("User cancelled Apple Sign In", "CANCELED")
        case .failed:
            call.reject("Apple Sign In failed", "FAILED")
        case .invalidResponse:
            call.reject("Invalid response from Apple", "INVALID_RESPONSE")
        case .notHandled:
            call.reject("Apple Sign In not handled", "NOT_HANDLED")
        case .notInteractive:
            call.reject("Apple Sign In not interactive", "NOT_INTERACTIVE")
        default:
            call.reject("Apple Sign In error: \(error.localizedDescription)", "UNKNOWN")
        }

        pendingCall = nil
    }
}
