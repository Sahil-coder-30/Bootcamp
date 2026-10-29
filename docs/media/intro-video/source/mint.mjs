import { SignJWT } from "/root/app/backend/node_modules/jose/dist/webapi/index.js";
const [iss, aud] = process.argv.slice(2);
const t = await new SignJWT({ email: "ananya.rao@jssaten.ac.in", role: "student" }).setProtectedHeader({ alg: "HS256" })
 .setSubject("11111111-1111-4111-8111-111111111111").setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime("12h")
 .sign(new TextEncoder().encode("video-demo-secret-video-demo-secret"));
console.log(t);
