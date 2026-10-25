import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// Only register the strategy if Google OAuth is actually configured, so the
// server still boots for devs who haven't set those env vars yet.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            const email = profile.emails?.[0]?.value;
            user = email ? await User.findOne({ email }) : null;
            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              user = await User.create({
                firstName: profile.name?.givenName || profile.displayName || "Utilisateur",
                lastName: profile.name?.familyName || "",
                email,
                googleId: profile.id,
              });
            }
          }
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

export default passport;
