#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(GoogleSignInPlugin, "GoogleSignIn",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(signIn, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(signOut, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePreviousSignIn, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(refresh, CAPPluginReturnPromise);
)
