import { defineAuth } from "@aws-amplify/backend";

// Cognito: cualquiera puede registrarse con su correo y lo confirma con un código.
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Tu código para Ruta SAA-C03",
      verificationEmailBody: (createCode) =>
        `¡Hola! Tu código para activar tu cuenta de Ruta SAA-C03 es ${createCode()}. Si no creaste una cuenta, ignora este correo.`,
    },
  },
  userAttributes: {
    preferredUsername: { mutable: true, required: false },
  },
});
