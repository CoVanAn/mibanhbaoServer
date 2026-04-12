import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import prisma from "../config/prisma.js";
import crypto from "crypto";

dotenv.config();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } =
  process.env;

const toValidAbsoluteUrl = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
};

const isLocalhostUrl = (value) => {
  const normalized = toValidAbsoluteUrl(value);
  if (!normalized) return false;
  return new URL(normalized).hostname === "localhost";
};

const resolveGoogleCallbackUrl = () => {
  const explicitCallback = toValidAbsoluteUrl(GOOGLE_OAUTH_REDIRECT_URI);
  const deploymentBaseUrl =
    toValidAbsoluteUrl(process.env.RENDER_EXTERNAL_URL) ||
    toValidAbsoluteUrl(process.env.BACKEND_URL) ||
    toValidAbsoluteUrl(process.env.SERVER_URL);

  // In production, avoid localhost callback to prevent redirect_uri_mismatch.
  if (process.env.NODE_ENV === "production") {
    if (explicitCallback && !isLocalhostUrl(explicitCallback)) {
      return explicitCallback;
    }

    if (deploymentBaseUrl) {
      const callbackUrl = new URL("/auth/google/callback", deploymentBaseUrl);
      if (explicitCallback && isLocalhostUrl(explicitCallback)) {
        console.warn(
          "[Google OAuth] GOOGLE_OAUTH_REDIRECT_URI is localhost in production. Falling back to deployment URL.",
        );
      }
      return callbackUrl.toString();
    }
  }

  return explicitCallback || "/auth/google/callback";
};

const googleCallbackUrl = resolveGoogleCallbackUrl();

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "⚠️  Google OAuth disabled: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment",
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;
          if (!email)
            return done(new Error("Email not found in Google profile"), null);

          // Try lookup by OAuthAccount first
          const existingOAuth = await prisma.oAuthAccount.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: profile.id,
              },
            },
            include: { user: true },
          });

          if (existingOAuth?.user) {
            return done(null, existingOAuth.user);
          }

          // Lookup by email
          let user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            // Create user with random password placeholder
            const randomPassword = `oauth-google:${crypto
              .randomBytes(16)
              .toString("hex")}`;
            user = await prisma.user.create({
              data: {
                name: profile.displayName || email.split("@")[0],
                email,
                password: randomPassword,
                hasPassword: false,
                avatar:
                  profile.photos && profile.photos.length > 0
                    ? profile.photos[0].value
                    : null,
              },
            });
          }

          // Create OAuthAccount link (idempotent via upsert)
          await prisma.oAuthAccount.upsert({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: profile.id,
              },
            },
            update: {
              accessToken: accessToken || null,
              refreshToken: refreshToken || null,
            },
            create: {
              userId: user.id,
              provider: "google",
              providerAccountId: profile.id,
              accessToken: accessToken || null,
              refreshToken: refreshToken || null,
            },
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  // Support both Prisma user (id) and potential Mongoose user (_id)
  // eslint-disable-next-line no-underscore-dangle
  const uid = user?.id || user?._id;
  done(null, uid);
});

passport.deserializeUser(async (id, done) => {
  try {
    const uid = typeof id === "string" ? parseInt(id, 10) : id;
    if (!Number.isInteger(uid) || uid <= 0) {
      return done(null, null);
    }
    const user = await prisma.user.findUnique({ where: { id: uid } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
