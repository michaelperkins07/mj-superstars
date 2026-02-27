import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleSignInPlugin)
public class GoogleSignInPlugin: CAPPlugin {
    
    private var pendingCall: CAPPluginCall?
    
    // MARK: - Initialize
    
    @objc func initialize(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId") else {
            call.reject("Must provide clientId")
            return
        }
        
        let config = GIDConfiguration(clientID: clientId)
        GIDSignIn.sharedInstance.configuration = config
        
        call.resolve()
    }
    
    // MARK: - Sign In
    
    @objc func signIn(_ call: CAPPluginCall) {
        pendingCall = call
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Get the root view controller
            guard let presentingViewController = self.bridge?.viewController else {
                call.reject("Unable to get view controller")
                return
            }
            
            GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { signInResult, error in
                guard let call = self.pendingCall else { return }
                
                if let error = error {
                    call.reject("Google Sign In failed: \(error.localizedDescription)", "ERROR", error)
                    self.pendingCall = nil
                    return
                }
                
                guard let signInResult = signInResult else {
                    call.reject("No sign in result")
                    self.pendingCall = nil
                    return
                }
                
                let user = signInResult.user
                
                var response: [String: Any] = [:]
                
                // User ID
                response["userId"] = user.userID
                
                // ID Token
                if let idToken = user.idToken?.tokenString {
                    response["idToken"] = idToken
                }
                
                // Access Token
                response["accessToken"] = user.accessToken.tokenString
                
                // Profile info
                if let profile = user.profile {
                    var profileData: [String: Any] = [:]
                    profileData["email"] = profile.email
                    profileData["name"] = profile.name
                    profileData["givenName"] = profile.givenName
                    profileData["familyName"] = profile.familyName
                    
                    if profile.hasImage, let imageUrl = profile.imageURL(withDimension: 200) {
                        profileData["imageUrl"] = imageUrl.absoluteString
                    }
                    
                    response["profile"] = profileData
                }
                
                // Server auth code (if requested)
                if let serverAuthCode = user.serverAuthCode {
                    response["serverAuthCode"] = serverAuthCode
                }
                
                call.resolve(["response": response])
                self.pendingCall = nil
            }
        }
    }
    
    // MARK: - Sign Out
    
    @objc func signOut(_ call: CAPPluginCall) {
        GIDSignIn.sharedInstance.signOut()
        call.resolve()
    }
    
    // MARK: - Restore Sign In
    
    @objc func restorePreviousSignIn(_ call: CAPPluginCall) {
        GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
            if let error = error {
                call.reject("Failed to restore sign in: \(error.localizedDescription)", "ERROR", error)
                return
            }
            
            guard let user = user else {
                call.reject("No previous sign in found")
                return
            }
            
            var response: [String: Any] = [:]
            response["userId"] = user.userID
            
            if let idToken = user.idToken?.tokenString {
                response["idToken"] = idToken
            }
            
            response["accessToken"] = user.accessToken.tokenString
            
            if let profile = user.profile {
                var profileData: [String: Any] = [:]
                profileData["email"] = profile.email
                profileData["name"] = profile.name
                profileData["givenName"] = profile.givenName
                profileData["familyName"] = profile.familyName
                
                if profile.hasImage, let imageUrl = profile.imageURL(withDimension: 200) {
                    profileData["imageUrl"] = imageUrl.absoluteString
                }
                
                response["profile"] = profileData
            }
            
            call.resolve(["response": response])
        }
    }
    
    // MARK: - Refresh Token
    
    @objc func refresh(_ call: CAPPluginCall) {
        guard let currentUser = GIDSignIn.sharedInstance.currentUser else {
            call.reject("No user is currently signed in")
            return
        }
        
        currentUser.refreshTokensIfNeeded { user, error in
            if let error = error {
                call.reject("Failed to refresh token: \(error.localizedDescription)", "ERROR", error)
                return
            }
            
            guard let user = user else {
                call.reject("No user returned after refresh")
                return
            }
            
            var response: [String: Any] = [:]
            
            if let idToken = user.idToken?.tokenString {
                response["idToken"] = idToken
            }
            
            response["accessToken"] = user.accessToken.tokenString
            
            call.resolve(["response": response])
        }
    }
}
