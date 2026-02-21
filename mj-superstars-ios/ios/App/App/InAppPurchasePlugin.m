#import <Capacitor/Capacitor.h>

CAP_PLUGIN(InAppPurchasePlugin, "InAppPurchase",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getProducts, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCurrentEntitlements, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchase, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(manageSubscriptions, CAPPluginReturnPromise);
)
