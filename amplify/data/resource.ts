import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/* Cada documento de progreso de la app (perfil, estado de preguntas, partidas, bitácora…)
   se guarda tal cual en DynamoDB. allow.owner(): cada usuario solo lee y escribe los suyos.
   id = "<sub del usuario>|<ruta del documento>"; deleted marca los borrados para sincronizarlos. */
const schema = a.schema({
  Doc: a
    .model({
      path: a.string().required(),
      data: a.json(),
      updated: a.float().required(),
      deleted: a.boolean(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
