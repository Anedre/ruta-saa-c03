/* Base de conocimiento del motor de razonamiento SAA-C03.
 *
 * Cada "familia" es una decisión típica del examen (qué almacenamiento, qué estrategia de DR…):
 *  - sols:  soluciones candidatas con atributos (a) y rangos por objetivo (r: menor = mejor).
 *  - cons:  requisitos. ok(a, p) dice si una solución lo cumple; why(a, p) explica por qué no.
 *           anchor: se incluye siempre que el objetivo lo cumpla (da contexto al escenario).
 *           fact:   no descarta; solo alimenta el cálculo de costo (costFn).
 *           grp:    como máximo un requisito por grupo en la misma pregunta.
 *           params: valores posibles; {p} en el texto se reemplaza por el valor elegido.
 *  - implicit: requisitos que se dan por sentados y no se escriben; si la respuesta objetivo
 *           no los cumple se agrega la frase "waiver" que los levanta.
 *  - goals: objetivos de desempate ("de la forma MÁS rentable", etc.).
 * Atributos en texto ("a b c") equivalen a {a:1, b:1, c:1}.
 */
(function (root) {
"use strict";

const ORGS = ["Una empresa de comercio electrónico", "Un banco regional", "Una startup de salud digital", "Una empresa de logística", "Una universidad", "Una empresa de medios", "Una cadena de retail con tiendas en todo el país", "Una aseguradora", "Una empresa de videojuegos", "Una agencia de gobierno", "Una fintech", "Una empresa de telecomunicaciones", "Una aerolínea", "Una empresa minera"];

const NOISE = ["La empresa ya usa AWS Organizations con facturación consolidada.", "Los equipos despliegan la infraestructura con AWS CloudFormation.", "La aplicación está escrita en Java y Python.", "El tráfico crece alrededor de un 20% cada año.", "La empresa tiene un plan de soporte Business.", "El equipo de operaciones trabaja en dos turnos.", "La empresa planea abrir oficinas en otro país el próximo año.", "Todos los recursos llevan etiquetas de proyecto y ambiente."];

const GOALS = {
  cost: { txt: "de la forma MÁS rentable", lose: "cumple los requisitos, pero cuesta más que la respuesta correcta", lbl: "Menor costo" },
  ops:  { txt: "con el MENOR esfuerzo operativo", lose: "cumple los requisitos, pero exige más administración", lbl: "Menor esfuerzo operativo" },
  perf: { txt: "con el MEJOR rendimiento", lose: "cumple los requisitos, pero rinde menos", lbl: "Mejor rendimiento" },
  ha:   { txt: "con la MAYOR disponibilidad", lose: "cumple los requisitos, pero ofrece menos disponibilidad", lbl: "Mayor disponibilidad" }
};

const has = k => a => !!a[k];
const fmtMin = m => m < 1 ? "segundos" : m < 60 ? Math.round(m) + " minutos" : m < 1440 ? Math.round(m / 60) + " horas" : Math.round(m / 1440) + " días";

const FAMILIES = [];
const fam = f => FAMILIES.push(f);

/* ═════════════════════════ DOMINIO 1 · SEGURIDAD ═════════════════════════ */

fam({ id: "identidad", t: "iam", name: "Identidades y credenciales",
  ctx: ["{org} está definiendo cómo se otorgará acceso a sus recursos de AWS.", "{org} revisa su modelo de identidades después de una auditoría de seguridad.", "{org} está ordenando el acceso a sus recursos de AWS antes de una certificación de seguridad."],
  ask: ["¿Qué solución debe implementar el arquitecto de soluciones", "¿Qué debe recomendar el arquitecto de soluciones"],
  sols: {
    role_ip: { n: "Un rol de IAM asociado a las instancias EC2 mediante un instance profile", a: { who: "workload", temp: 1 }, al: /instance profile|perfil de instancia|rol (de )?IAM.{0,60}(instancias?|EC2)/i },
    keys_file: { n: "Un usuario de IAM con access keys guardadas en el archivo de credenciales de la instancia", a: { who: "workload", temp: 0 }, al: /access keys?.{0,60}(archivo|AMI|c[oó]digo|credentials)/i },
    keys_ssm: { n: "Access keys de un usuario de IAM guardadas como SecureString en Parameter Store", a: { who: "workload", temp: 0 }, al: /(access keys?|llaves).{0,60}Parameter Store/i, nt: { temp: "sigue usando llaves de larga duración: cifrarlas no las vuelve temporales" } },
    idc: { n: "IAM Identity Center conectado al directorio corporativo, con permission sets por cuenta", a: { who: "workforce", temp: 1, multi: 1, corp: 1 }, al: /Identity Center|AWS SSO/i },
    iamusers: { n: "Un usuario de IAM por empleado en cada cuenta, con MFA obligatorio", a: { who: "workforce", temp: 0, multi: 0, corp: 0, mkusers: 1 }, al: /usuarios? (de )?IAM.{0,25}(para|por) (cada|empleado|desarrollador)/i },
    saml1: { n: "Federación SAML 2.0 desde el IdP corporativo hacia un rol de IAM de una sola cuenta", a: { who: "workforce", temp: 1, multi: 0, corp: 1 }, al: /SAML/i },
    cognito: { n: "Un user pool de Amazon Cognito con un identity pool que entrega credenciales temporales", a: { who: "customer", temp: 1 }, al: /Cognito/i },
    xrole: { n: "Un rol de IAM en la cuenta destino con trust policy hacia la cuenta origen, asumido con sts:AssumeRole", a: { who: "partner", temp: 1 }, al: /trust policy|AssumeRole/i },
    root: { n: "Compartir las credenciales del usuario root de la cuenta destino con el otro equipo", a: { who: "partner", temp: 0, root: 1 }, al: /usuario root/i }
  },
  cons: {
    w_workload: { t: "Una aplicación que se ejecuta en instancias EC2 necesita escribir en una tabla de DynamoDB.", lbl: "Carga de trabajo en EC2", grp: "who", anchor: 1,
      ok: a => a.who === "workload", det: /aplicaci[oó]n.{0,40}(en|ejecuta en) (instancias )?EC2|instancias EC2 necesita/i,
      why: a => a.who === "workforce" ? "está pensado para empleados que inician sesión, no para una aplicación en EC2" : a.who === "customer" ? "está diseñado para usuarios finales de una app web o móvil" : "resuelve el acceso entre cuentas, no las credenciales de la propia aplicación" },
    w_workforce: { t: "Cientos de empleados deben iniciar sesión en la consola de AWS con su usuario corporativo.", lbl: "Empleados en la consola", grp: "who", anchor: 1,
      ok: a => a.who === "workforce", det: /empleados.{0,40}(inicien|iniciar) sesi[oó]n|usuarios corporativos/i,
      why: a => a.who === "workload" ? "sirve para que una aplicación obtenga credenciales, no para que personas inicien sesión" : a.who === "customer" ? "está diseñado para clientes de una app, no para empleados" : "no resuelve el inicio de sesión de los empleados" },
    w_customer: { t: "Los clientes de una app móvil deben subir fotos directamente a un bucket de S3.", lbl: "Clientes de una app móvil", grp: "who", anchor: 1,
      ok: a => a.who === "customer", det: /app(licaci[oó]n)? m[oó]vil|usuarios de la app/i,
      why: a => a.who === "workforce" ? "está pensado para empleados, no para millones de clientes de una app" : "no entrega identidades a usuarios finales de una app" },
    w_partner: { t: "Un equipo de otra cuenta de AWS de la empresa debe leer ocasionalmente datos de esta cuenta.", lbl: "Acceso desde otra cuenta", grp: "who", anchor: 1,
      ok: a => a.who === "partner", det: /otra cuenta|entre cuentas|cuenta (A|B)\b|cuentas? de (desarrollo|producci[oó]n)/i,
      why: a => a.who === "workload" ? "da credenciales a instancias de esta cuenta, no a otra cuenta" : "no resuelve el acceso entre cuentas" },
    temp: { t: "La política de seguridad prohíbe las credenciales de larga duración.", lbl: "Solo credenciales temporales", ok: has("temp"), det: /larga duraci[oó]n|credenciales temporales/i, why: "usa credenciales de larga duración que no rotan solas" },
    multi: { t: "La empresa tiene más de 40 cuentas en AWS Organizations y quiere un único punto de inicio de sesión.", lbl: "Muchas cuentas, un solo acceso", ok: has("multi"), det: /(\d{2,}|varias|muchas|decenas de) cuentas/i, why: "obliga a configurar el acceso cuenta por cuenta" },
    corp: { t: "Las identidades ya existen en Active Directory y no deben duplicarse en AWS.", lbl: "Reusar Active Directory", ok: has("corp"), det: /Active Directory|IdP corporativo|directorio corporativo/i, why: "no reutiliza las identidades del directorio corporativo" },
    nousers: { t: "No se deben crear usuarios de IAM nuevos para este acceso.", lbl: "Sin usuarios IAM nuevos", ok: a => !a.mkusers, det: /sin crear usuarios|no (se )?(deben|debe) crear usuarios/i, why: "requiere crear y mantener usuarios de IAM" }
  },
  implicit: [{ c: "noroot" }],
  extra: { noroot: { t: "", lbl: "Nunca compartir el root", ok: a => !a.root, why: "expone la identidad con más privilegios de la cuenta; el root nunca se comparte" } },
  rule: "Aplicación en AWS → rol (credenciales temporales de STS). Empleados en muchas cuentas → IAM Identity Center. Clientes de una app → Cognito. Otra cuenta → rol con trust policy + AssumeRole. Nunca access keys en el código ni el root."
});

fam({ id: "gobierno", t: "org", name: "Gobierno multi-cuenta",
  ctx: ["{org} administra decenas de cuentas de AWS con AWS Organizations.", "{org} está creciendo rápido y cada equipo tiene su propia cuenta de AWS."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["ops", "cost"],
  sols: {
    scp: { n: "Una SCP de AWS Organizations adjunta a la OU de las cuentas", a: "prev admins auto", r: { ops: 1, cost: 1 }, al: /\bSCPs?\b|Service Control Polic/i },
    iamdeny: { n: "Una política de IAM de denegación adjunta a cada usuario y rol de las cuentas", a: "prev", r: { ops: 4, cost: 1 }, al: /pol[ií]ticas? (de )?IAM/i, nt: { admins: "puede quitarla cualquier administrador de la cuenta y no se aplica al usuario root" } },
    ct: { n: "AWS Control Tower con account factory y sus controles preventivos y detectivos", a: "prev admins auto detect landing", r: { ops: 2, cost: 3 }, al: /Control Tower/i },
    config: { n: "Reglas de AWS Config desplegadas en la organización con remediación automática", a: "detect auto", r: { ops: 2, cost: 2 }, al: /AWS Config|reglas de Config/i, nt: { prev: "detecta y corrige después de que el cambio ocurre; no lo impide" } },
    boundary: { n: "Un permissions boundary obligatorio en los roles que crean los desarrolladores", a: "prev deleg", r: { ops: 2, cost: 1 }, al: /permissions boundar|l[ií]mite de permisos/i },
    orgid: { n: "Una bucket policy con la condición aws:PrincipalOrgID", a: "share", r: { ops: 1, cost: 1 }, al: /PrincipalOrgID/i }
  },
  cons: {
    admins: { t: "Nadie en las cuentas miembro, ni siquiera los administradores o el usuario root, debe poder hacerlo.", lbl: "Aplica también a administradores", ok: has("admins"), det: /ni siquiera|incluso (los )?administradores|incluidos? (sus )?administradores|NING[UÚ]N usuario|usuario root de las cuentas/i, why: "no se impone a los administradores ni al usuario root de las cuentas miembro" },
    prev: { t: "La acción debe bloquearse antes de que ocurra, no solo detectarse.", lbl: "Preventivo", ok: has("prev"), det: /bloquear|impedir|evitar que/i, why: "no impide la acción; como mucho la detecta" },
    auto: { t: "El control debe aplicarse automáticamente a todas las cuentas, incluidas las que se creen en el futuro.", lbl: "Automático en todas las cuentas", ok: has("auto"), det: /(decenas de|todas las|nuevas) cuentas/i, why: "hay que configurarlo manualmente cuenta por cuenta" },
    landing: { t: "Se necesita una landing zone con cuentas de Log Archive y Audit ya configuradas.", lbl: "Landing zone", ok: has("landing"), det: /landing zone|cuenta de auditor[ií]a|guardrails/i, why: "no crea una landing zone multi-cuenta" },
    detect: { t: "También hay que detectar e informar los recursos existentes que no cumplen las normas.", lbl: "Detectar incumplimientos", ok: has("detect"), det: /detectar.{0,40}(no cumplen|incumpl)|detectivos/i, why: "no detecta recursos que ya están fuera de norma" },
    deleg: { t: "Los desarrolladores pueden crear roles para sus aplicaciones, pero sin otorgarse más permisos de los permitidos.", lbl: "Delegar creación de roles", ok: has("deleg"), det: /desarrolladores.{0,40}crear roles|delegar/i, why: "no limita los permisos de los roles que crean los desarrolladores" },
    share: { t: "Todas las cuentas de la organización, actuales y futuras, deben poder leer un bucket central sin listarlas una por una.", lbl: "Bucket para toda la organización", ok: has("share"), det: /sin listar|todas las cuentas de (la|mi) organizaci[oó]n/i, why: "no da acceso a un recurso a toda la organización" }
  },
  rule: "Bloquear algo en todas las cuentas, incluso a administradores → SCP (no otorga permisos). Landing zone + guardrails → Control Tower. Detectar incumplimientos → Config. Delegar creación de roles → permissions boundary. Bucket para toda la organización → aws:PrincipalOrgID."
});

fam({ id: "redvpc", t: "vpcsec", name: "Filtrado de tráfico en la VPC",
  ctx: ["{org} ejecuta una aplicación de tres capas en una VPC con subredes públicas y privadas.", "{org} está endureciendo la seguridad de red de su VPC de producción."],
  ask: ["¿Qué debe implementar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    sg: { n: "Reglas en los security groups de las instancias", a: { stateful: 1, deny: 0, refsg: 1 }, r: { cost: 1 }, al: /security groups?|grupos? de seguridad/i },
    nacl: { n: "Una network ACL asociada a la subred", a: { stateful: 0, deny: 1 }, r: { cost: 1 }, al: /network ACL|NACL|ACL de red/i },
    nfw: { n: "AWS Network Firewall en una subred de inspección", a: { stateful: 1, deny: 1, ids: 1, domain: 1 }, r: { cost: 5 }, al: /Network Firewall/i },
    waf: { n: "AWS WAF asociado al Application Load Balancer", a: { deny: 1, l7: 1 }, r: { cost: 3 }, al: /\bWAF\b/i },
    gwep: { n: "Un gateway VPC endpoint para S3", a: { s3priv: 1 }, r: { cost: 1 }, al: /gateway (VPC )?endpoint|endpoint de (tipo )?gateway/i },
    nat: { n: "Un NAT gateway en una subred pública", a: { outbound: 1 }, r: { cost: 4 }, al: /NAT gateway/i }
  },
  cons: {
    denyip: { t: "Se debe bloquear explícitamente un rango de IP que está atacando a todas las instancias de una subred.", lbl: "Denegar un rango de IP", ok: has("deny"), det: /bloquear (expl[ií]citamente )?(un )?(rango de )?(direcciones )?IP|bloquear (ese|un|el) rango|rango de IP|denegar/i,
      why: a => a.deny === 0 ? "solo admite reglas de permiso: no puede denegar un rango explícitamente" : "no es un control para filtrar tráfico entrante por IP" },
    stateful: { t: "El tráfico de respuesta debe permitirse automáticamente, sin reglas para los puertos efímeros.", lbl: "Stateful", ok: has("stateful"), det: /stateful|puertos ef[ií]meros|tr[aá]fico de (respuesta|retorno)/i,
      why: a => a.stateful === 0 ? "es stateless: exige reglas explícitas para el tráfico de retorno" : "no evalúa conexiones de red" },
    refsg: { t: "La capa de base de datos solo debe aceptar tráfico de la capa web, aunque las IP de la capa web cambien con Auto Scaling.", lbl: "Origen = otro security group", ok: has("refsg"), det: /aunque (sus |las )?IP cambien|solo (debe )?aceptar tr[aá]fico de|solo tr[aá]fico de la capa/i, why: "no puede usar otro security group como origen; dependería de direcciones IP" },
    l7: { t: "Se deben bloquear intentos de inyección SQL y cross-site scripting en las solicitudes HTTP.", lbl: "Capa 7 (HTTP)", ok: has("l7"), det: /inyecci[oó]n SQL|SQL injection|cross-site|XSS/i, why: "trabaja en capas 3 y 4 y no inspecciona el contenido HTTP" },
    ids: { t: "Se requiere inspección profunda de paquetes con reglas IPS compatibles con Suricata para todo el tráfico que entra y sale de la VPC.", lbl: "IPS / inspección profunda", ok: has("ids"), det: /\bIPS\b|\bIDS\b|Suricata|inspecci[oó]n profunda/i, why: "no hace inspección profunda ni IPS de todo el tráfico de la VPC" },
    domain: { t: "El tráfico de salida de la VPC solo puede ir a una lista de dominios aprobados.", lbl: "Filtrar salida por dominio", ok: has("domain"), det: /dominios aprobados|lista de dominios|FQDN/i, why: "no filtra la salida por nombre de dominio" },
    s3priv: { t: "Las instancias de subredes privadas deben leer de S3 sin salir a internet y sin pagar por procesamiento de datos.", lbl: "S3 privado y sin costo", ok: has("s3priv"), det: /(sin (salir|pasar) (a|por) internet|fuera de internet).{0,80}S3|S3.{0,120}(sin (salir|pasar) (a|por) internet|fuera de internet)/i,
      why: a => a.outbound ? "envía el tráfico por internet y cobra por cada GB procesado" : "no da una ruta privada hacia S3" }
  },
  rule: "Security group: stateful, solo allow, a nivel de ENI y puede referenciar otro SG. NACL: stateless, allow y deny, a nivel de subred. SQLi/XSS → WAF. IPS y filtrado por dominio → Network Firewall. S3 privado y gratis → gateway endpoint."
});

fam({ id: "amenazas", t: "threat", name: "Protección y detección de amenazas",
  ctx: ["{org} expone una aplicación web pública detrás de un Application Load Balancer y CloudFront.", "{org} quiere mejorar su postura de seguridad en AWS."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué servicio de AWS cumple este requisito"],
  goals: ["cost"],
  sols: {
    shstd: { n: "AWS Shield Standard", a: "ddos", r: { cost: 1 }, al: /Shield Standard/i },
    shadv: { n: "AWS Shield Advanced", a: "ddos drt", r: { cost: 5 }, al: /Shield Advanced/i },
    waf: { n: "AWS WAF con reglas administradas y reglas basadas en tasa", a: "l7", r: { cost: 2 }, al: /\bWAF\b/i },
    gd: { n: "Amazon GuardDuty", a: "threat", r: { cost: 2 }, al: /GuardDuty/i },
    insp: { n: "Amazon Inspector", a: "vuln", r: { cost: 2 }, al: /Inspector/i },
    macie: { n: "Amazon Macie", a: "pii", r: { cost: 2 }, al: /Macie/i },
    detective: { n: "Amazon Detective", a: "rootcause", r: { cost: 2 }, al: /Amazon Detective|\bDetective\b/ },
    sh: { n: "AWS Security Hub", a: "agg", r: { cost: 2 }, al: /Security Hub/i },
    fms: { n: "AWS Firewall Manager", a: "central", r: { cost: 3 }, al: /Firewall Manager/i }
  },
  cons: {
    ddos: { t: "La aplicación debe estar protegida contra ataques DDoS comunes de capa 3 y 4.", lbl: "DDoS capa 3/4", ok: has("ddos"), det: /DDoS/i, why: "no es una protección contra DDoS de red" },
    drt: { t: "La empresa quiere acceso 24/7 al equipo de respuesta a DDoS de AWS y protección ante cargos por escalado durante un ataque.", lbl: "Equipo de respuesta + protección de costos", ok: has("drt"), det: /equipo de respuesta|\bSRT\b|\bDRT\b|protecci[oó]n de costos/i,
      why: a => a.ddos ? "no incluye el equipo de respuesta (SRT) ni la protección de costos" : "no ofrece respuesta a DDoS ni protección de costos" },
    l7: { t: "Se deben bloquear inyecciones SQL y limitar la cantidad de solicitudes HTTP por IP.", lbl: "Filtrado HTTP", ok: has("l7"), det: /inyecci[oó]n SQL|SQL injection|XSS|solicitudes.{0,20}por IP|rate-based/i, why: "no inspecciona ni limita solicitudes HTTP" },
    threat: { t: "Se debe detectar actividad maliciosa, como minería de criptomonedas o llamadas desde IP maliciosas, analizando CloudTrail, VPC Flow Logs y DNS.", lbl: "Detección de amenazas", ok: has("threat"), det: /miner[ií]a|criptomonedas|actividad maliciosa|comportamiento an[oó]malo|IP maliciosas/i, why: "no analiza CloudTrail, Flow Logs y DNS para detectar amenazas" },
    vuln: { t: "Se deben evaluar continuamente las instancias EC2 y las imágenes de ECR en busca de vulnerabilidades (CVE).", lbl: "Escaneo de CVE", ok: has("vuln"), det: /vulnerabilidades|\bCVE\b/i, why: "no escanea el software en busca de CVE" },
    pii: { t: "Hay que descubrir automáticamente datos personales, como números de tarjeta, guardados en buckets de S3.", lbl: "Datos sensibles en S3", ok: has("pii"), det: /datos personales|\bPII\b|datos sensibles|tarjetas? de cr[eé]dito/i, why: "no clasifica datos sensibles guardados en S3" },
    rootcause: { t: "Los analistas deben investigar la causa raíz de un hallazgo con visualizaciones de la actividad relacionada.", lbl: "Investigar causa raíz", ok: has("rootcause"), det: /causa ra[ií]z/i, why: "no está pensado para investigar la causa raíz de un hallazgo" },
    agg: { t: "Se necesita una vista única de los hallazgos de varios servicios de seguridad y verificaciones contra estándares como CIS.", lbl: "Vista consolidada", ok: has("agg"), det: /vista (única|unica|consolidada|central)|\bCIS\b/i, why: "no consolida hallazgos ni evalúa estándares como CIS" },
    central: { t: "Las reglas de WAF y la protección de Shield Advanced deben aplicarse de forma central en todas las cuentas de la organización.", lbl: "Reglas centralizadas", ok: has("central"), det: /de forma central.{0,60}(cuentas|organizaci)|todas las cuentas.{0,60}(WAF|Shield)/i, why: "no administra reglas de firewall de forma central entre cuentas" }
  },
  rule: "DDoS básico sin costo → Shield Standard; SRT + protección de costos → Shield Advanced; SQLi/XSS/límite por IP → WAF; amenazas en logs → GuardDuty; CVE → Inspector; PII en S3 → Macie; causa raíz → Detective; vista consolidada → Security Hub; reglas centralizadas → Firewall Manager."
});

fam({ id: "cifrado", t: "encrypt", name: "Cifrado, llaves y secretos",
  ctx: ["{org} debe cumplir una nueva norma de protección de datos.", "{org} está reforzando la protección de sus datos en AWS antes de una auditoría."],
  ask: ["¿Qué solución debe usar el arquitecto de soluciones", "¿Qué opción cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    sses3: { n: "SSE-S3 (llaves administradas por Amazon S3)", a: "s3 nomgmt", r: { cost: 1 }, al: /SSE-S3/i },
    kmsaws: { n: "SSE-KMS con la llave administrada por AWS (aws/s3)", a: "s3 audit", r: { cost: 2 }, al: /aws\/s3|llave administrada por AWS|AWS managed key/i },
    kmscmk: { n: "SSE-KMS con una llave administrada por el cliente (customer managed key)", a: "s3 audit kpol", r: { cost: 3 }, al: /customer managed|administrada por el cliente|\bCMK\b/i },
    ssec: { n: "SSE-C (el cliente envía su propia llave en cada solicitud)", a: "s3 ownkey", r: { cost: 2 }, al: /SSE-C\b/i },
    cse: { n: "Cifrado del lado del cliente antes de subir los datos", a: "s3 client ownkey", r: { cost: 3 }, al: /lado del cliente|client-side/i },
    hsm: { n: "AWS CloudHSM con llaves en un HSM dedicado", a: "s3 dedicated", r: { cost: 5 }, al: /CloudHSM/i },
    secrets: { n: "AWS Secrets Manager", a: "dbrotate", r: { cost: 3 }, al: /Secrets Manager/i },
    param: { n: "SecureString en AWS Systems Manager Parameter Store", a: "params", r: { cost: 1 }, al: /Parameter Store/i },
    acm: { n: "AWS Certificate Manager (ACM)", a: "tls", r: { cost: 1 }, al: /Certificate Manager|\bACM\b/i }
  },
  cons: {
    s3: { t: "Los objetos de un bucket de S3 deben cifrarse en reposo.", lbl: "Cifrar S3 en reposo", grp: "need", anchor: 1, ok: has("s3"), det: /cifr.{0,40}(en reposo|bucket|objetos)/i, why: "no cifra objetos de S3 en reposo" },
    audit: { t: "Cada uso de la llave debe quedar registrado en AWS CloudTrail.", lbl: "Auditoría en CloudTrail", ok: has("audit"), det: /CloudTrail|auditar.{0,15}uso de (la|las) llaves?/i, why: "no deja en CloudTrail un registro de cada uso de la llave" },
    kpol: { t: "El equipo de seguridad debe controlar la key policy y poder deshabilitar la llave cuando quiera.", lbl: "Controlar la key policy", ok: has("kpol"), det: /key policy|deshabilitar la llave|pol[ií]ticas propias|qui[eé]n puede usarla/i, why: "no permite administrar una key policy propia en KMS" },
    nomgmt: { t: "El equipo no quiere administrar llaves ni pagar solicitudes a KMS.", lbl: "Cero gestión de llaves", ok: has("nomgmt"), det: /no (quiere|desea) (administrar|gestionar) llaves|sin administrar llaves/i, why: "implica administrar llaves o pagar solicitudes a KMS" },
    dedicated: { t: "La regulación exige llaves en un HSM dedicado de un solo inquilino bajo control exclusivo de la empresa.", lbl: "HSM dedicado", ok: has("dedicated"), det: /HSM dedicado|un solo inquilino|single-tenant/i, why: "usa infraestructura multiinquilino administrada por AWS" },
    client: { t: "Los datos deben viajar ya cifrados desde la red de la empresa; AWS nunca debe ver el texto en claro.", lbl: "Cifrar antes de enviar", ok: has("client"), det: /antes de (enviar|subir|salir)|nunca (debe )?ver/i, why: "cifra al llegar a AWS: AWS procesa los datos en claro" },
    ownkey: { t: "La empresa debe generar y guardar sus propias llaves fuera de AWS.", lbl: "Llaves fuera de AWS", ok: has("ownkey"), det: /fuera de AWS|propias llaves/i, why: "las llaves viven dentro de AWS" },
    dbrotate: { t: "La contraseña de una base de datos RDS debe rotar automáticamente cada 30 días sin cambios de código.", lbl: "Rotar contraseñas de BD", grp: "need", anchor: 1, ok: has("dbrotate"), det: /rot(e|ar|aci[oó]n).{0,40}(contraseña|credencial|secreto)|(contraseña|credencial).{0,40}rot/i, why: "no rota automáticamente credenciales de bases de datos" },
    params: { t: "Se deben guardar parámetros de configuración, algunos cifrados, sin costo adicional; no se requiere rotación automática.", lbl: "Parámetros sin costo", grp: "need", anchor: 1, ok: has("params"), det: /par[aá]metros de configuraci[oó]n/i, why: "tiene costo por secreto o no está pensado para guardar parámetros" },
    tls: { t: "Un Application Load Balancer necesita certificados TLS públicos que se renueven automáticamente.", lbl: "Certificados TLS", grp: "need", anchor: 1, ok: has("tls"), det: /certificados? (TLS|SSL)/i, why: "no emite ni renueva certificados TLS" }
  },
  rule: "Auditar el uso de llaves → KMS. Controlar la key policy → customer managed key. Sin gestión → SSE-S3. HSM dedicado → CloudHSM. Cifrar antes de enviar → del lado del cliente. Rotar contraseñas de BD → Secrets Manager. Parámetros sin costo → Parameter Store. TLS → ACM."
});

fam({ id: "s3proteccion", t: "s3sec", name: "Protección de datos en S3",
  ctx: ["{org} guarda documentos críticos en un bucket de Amazon S3.", "{org} usa Amazon S3 como repositorio central de archivos."],
  ask: ["¿Qué debe configurar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["ops"],
  sols: {
    ver: { n: "Habilitar S3 Versioning en el bucket", a: "recover", r: { ops: 1 }, al: /S3 Versioning|versionado|Versioning/i },
    lockc: { n: "S3 Object Lock en modo compliance con período de retención", a: "recover worm strict", r: { ops: 2 }, al: /Object Lock.{0,30}compliance|modo compliance|modo de cumplimiento/i },
    lockg: { n: "S3 Object Lock en modo governance con período de retención", a: "recover worm admins", r: { ops: 2 }, al: /governance|gobernanza/i },
    mfad: { n: "MFA Delete en el bucket versionado", a: "recover mfa", r: { ops: 3 }, al: /MFA Delete/i },
    bpa: { n: "S3 Block Public Access a nivel de cuenta", a: "nopublic", r: { ops: 1 }, al: /Block Public Access|bloqueo de acceso p[uú]blico/i },
    presign: { n: "Una URL prefirmada con vencimiento de 1 hora", a: "temp", r: { ops: 1 }, al: /prefirmada|presigned/i },
    oac: { n: "Una distribución de CloudFront con Origin Access Control (OAC) y una bucket policy que solo permite a CloudFront", a: "cdnonly", r: { ops: 2 }, al: /\bOAC\b|Origin Access (Control|Identity)|\bOAI\b/i },
    crr: { n: "S3 Cross-Region Replication hacia un bucket de otra región", a: "copyregion", r: { ops: 2 }, al: /Cross-Region Replication|replicaci[oó]n entre regiones|\bCRR\b/i },
    tlsonly: { n: "Una bucket policy que deniega las solicitudes con aws:SecureTransport = false", a: "tls", r: { ops: 1 }, al: /SecureTransport/i },
    ap: { n: "S3 Access Points, uno por aplicación con su propia política", a: "perapp", r: { ops: 2 }, al: /Access Points?|puntos de acceso/i },
    pub: { n: "Hacer público el bucket y confiar en que la URL no se comparta", a: "", r: { ops: 1 }, al: /hacer p[uú]blico el bucket|bucket p[uú]blico/i }
  },
  cons: {
    recover: { t: "Se deben poder recuperar objetos borrados o sobrescritos por error.", lbl: "Recuperar borrados", ok: has("recover"), det: /recuperar.{0,40}(borrad|eliminad|sobrescrit)|(borrad|eliminad)os? (por error|accidental)/i, why: "no conserva versiones anteriores de los objetos" },
    worm: { t: "Los registros deben ser inmutables (WORM) durante 7 años.", lbl: "WORM", ok: has("worm"), det: /WORM|inmutables?/i, why: "no impide modificar ni borrar los objetos durante un período" },
    strict: { t: "Nadie, ni siquiera el usuario root, debe poder borrarlos antes de que venza la retención.", lbl: "Ni el root puede borrar", ok: has("strict"), det: /ni siquiera (el usuario )?root/i,
      why: a => a.worm ? "permite que usuarios con s3:BypassGovernanceRetention eliminen la protección" : "no impone una retención que ni el root pueda saltarse" },
    admins: { t: "Un grupo reducido de administradores debe poder acortar la retención en casos excepcionales.", lbl: "Excepción para administradores", ok: has("admins"), det: /excepcional|administradores.{0,40}(acortar|retenci[oó]n)/i,
      why: a => a.strict ? "en modo compliance nadie puede acortar la retención, ni siquiera el root" : "no ofrece una retención WORM con excepciones controladas" },
    mfa: { t: "El borrado permanente de versiones debe exigir la autenticación MFA del usuario root.", lbl: "MFA para borrar", ok: has("mfa"), det: /MFA.{0,40}(borr|elimin)|(borr|elimin).{0,40}MFA/i, why: "no exige MFA para borrar versiones" },
    nopublic: { t: "Hay que evitar que cualquier bucket de la cuenta, actual o futuro, se haga público por error.", lbl: "Evitar buckets públicos", ok: has("nopublic"), det: /(se haga|hacer) p[uú]blico|hechos? p[uú]blicos?|acceso p[uú]blico/i, why: "no impide que alguien publique un bucket" },
    temp: { t: "Un cliente externo sin cuenta de AWS debe descargar un archivo privado solo durante 1 hora.", lbl: "Acceso temporal sin cuenta", ok: has("temp"), det: /sin cuenta de AWS|durante (1|una) hora/i, why: "no da acceso temporal y acotado a un objeto privado" },
    cdnonly: { t: "Los usuarios solo deben acceder a los objetos a través de CloudFront, nunca directamente al bucket.", lbl: "Solo vía CloudFront", ok: has("cdnonly"), det: /solo.{0,30}(a trav[eé]s de|por|desde) CloudFront|nunca directamente/i, why: "no impide el acceso directo al bucket" },
    copyregion: { t: "Cada objeto nuevo debe copiarse automáticamente a otra región para recuperación ante desastres.", lbl: "Copia en otra región", ok: has("copyregion"), det: /otra regi[oó]n/i, why: "no copia objetos a otra región" },
    tls: { t: "Se debe rechazar cualquier solicitud al bucket que no use HTTPS.", lbl: "Solo HTTPS", ok: has("tls"), det: /HTTPS|en tr[aá]nsito/i, why: "no obliga a usar HTTPS" },
    perapp: { t: "Decenas de aplicaciones con permisos distintos usan el mismo bucket y la bucket policy ya es inmanejable.", lbl: "Acceso por aplicación", ok: has("perapp"), det: /inmanejable|decenas de aplicaciones/i, why: "no simplifica el acceso de muchas aplicaciones a un bucket compartido" }
  },
  rule: "Borrados accidentales → Versioning (+ MFA Delete). WORM estricto → Object Lock compliance; con excepción para administradores → governance. Temporal sin cuenta → URL prefirmada. Solo por CloudFront → OAC. Evitar públicos → Block Public Access. Solo HTTPS → aws:SecureTransport. Muchas apps → Access Points."
});

fam({ id: "auditoria", t: "audit", name: "Auditoría y monitoreo",
  ctx: ["{org} debe demostrar a sus auditores cómo controla su entorno de AWS.", "{org} quiere mejorar la visibilidad de lo que ocurre en sus cuentas de AWS."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué servicio de AWS cumple este requisito"],
  sols: {
    trail: { n: "AWS CloudTrail", a: "api", al: /CloudTrail/i },
    config: { n: "AWS Config", a: "cfghist", al: /AWS Config\b|Config\b/ },
    cw: { n: "Amazon CloudWatch (métricas y alarmas)", a: "metric", al: /CloudWatch(?! Logs)/i },
    cwl: { n: "Amazon CloudWatch Logs con Logs Insights", a: "applogs", al: /CloudWatch Logs|Logs Insights/i },
    flow: { n: "VPC Flow Logs", a: "iptraffic", al: /Flow Logs/i },
    artifact: { n: "AWS Artifact", a: "reports", al: /Artifact/i },
    am: { n: "AWS Audit Manager", a: "evidence", al: /Audit Manager/i },
    ta: { n: "AWS Trusted Advisor", a: "bestpractice", al: /Trusted Advisor/i }
  },
  cons: {
    api: { t: "Se debe saber qué usuario eliminó un security group, cuándo y desde qué IP.", lbl: "Quién hizo cada llamada", ok: has("api"), det: /qu[eé] usuario|qui[eé]n (elimin|borr|modific|cre|lo hizo)|desde qu[eé] IP|llamadas? a la API/i, why: "no registra las llamadas a la API ni quién las hizo" },
    cfghist: { t: "Hay que ver el historial de configuración de cada recurso y evaluar continuamente si cumple reglas internas.", lbl: "Historial de configuración", ok: has("cfghist"), det: /historial de (configuraci[oó]n|cambios)|cumpl(e|en) (con )?reglas|evaluar continuamente|remediaci[oó]n autom/i, why: "no guarda el historial de configuración de los recursos" },
    metric: { t: "Se debe enviar una alarma cuando el uso de CPU supere el 80% durante 5 minutos.", lbl: "Métricas y alarmas", ok: has("metric"), det: /alarma|CPU.{0,30}%/i, why: "no genera alarmas sobre métricas" },
    applogs: { t: "Los logs de la aplicación deben centralizarse y consultarse con un lenguaje de consultas.", lbl: "Logs de aplicación", ok: has("applogs"), det: /logs de (la )?aplicaci[oó]n|Logs Insights/i, why: "no centraliza ni consulta logs de aplicaciones" },
    iptraffic: { t: "Se debe registrar el tráfico IP aceptado y rechazado de las interfaces de red de una VPC.", lbl: "Tráfico IP de la VPC", ok: has("iptraffic"), det: /tr[aá]fico IP|aceptado y rechazado|interfaces de red/i, why: "no registra el tráfico IP de la VPC" },
    reports: { t: "Los auditores piden los informes SOC 2 y PCI de la infraestructura de AWS.", lbl: "Informes de AWS", ok: has("reports"), det: /\bSOC\b|\bPCI\b|informes de cumplimiento/i, why: "no entrega los informes de cumplimiento de AWS" },
    evidence: { t: "Se debe recolectar evidencia de forma continua y mapearla a marcos como HIPAA para preparar auditorías.", lbl: "Evidencia para auditorías", ok: has("evidence"), det: /evidencia|HIPAA/i, why: "no recolecta evidencia mapeada a marcos de cumplimiento" },
    bestpractice: { t: "Se quieren recomendaciones automáticas sobre costos, seguridad y límites de servicio de la cuenta.", lbl: "Recomendaciones", ok: has("bestpractice"), det: /recomendaciones|l[ií]mites de servicio/i, why: "no da recomendaciones de buenas prácticas" }
  },
  rule: "Quién hizo qué → CloudTrail; cómo estaba configurado → Config; métricas y alarmas → CloudWatch; logs de apps → CloudWatch Logs; tráfico IP → Flow Logs; informes de AWS → Artifact; evidencia de auditoría → Audit Manager; recomendaciones → Trusted Advisor."
});

/* ═════════════════════════ DOMINIO 2 · RESILIENCIA ═════════════════════════ */

fam({ id: "desacople", t: "decouple", name: "Mensajería y desacoplamiento",
  ctx: ["{org} está separando su aplicación de pedidos en microservicios.", "{org} tiene un sistema de pedidos que se cae en los picos de tráfico porque los servicios se llaman directamente."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["cost", "ops"],
  sols: {
    sqs: { n: "Una cola estándar de Amazon SQS", a: "buffer managed", r: { cost: 1, ops: 1 }, al: /cola est[aá]ndar|SQS (est[aá]ndar|standard)|\bSQS\b/i },
    fifo: { n: "Una cola FIFO de Amazon SQS", a: "buffer order once managed", r: { cost: 2, ops: 1 }, al: /FIFO/i },
    sns: { n: "Un tema de Amazon SNS", a: "fan managed", r: { cost: 1, ops: 1 }, al: /\bSNS\b/i },
    fanout: { n: "Un tema de SNS con una cola de SQS suscrita por cada sistema (fan-out)", a: "buffer fan managed", r: { cost: 2, ops: 2 }, al: /fan-?out|SNS.{0,40}SQS|SQS.{0,40}SNS/i },
    eb: { n: "Un bus de eventos de Amazon EventBridge con reglas", a: "fan rules managed", r: { cost: 2, ops: 1 }, al: /EventBridge/i },
    kds: { n: "Amazon Kinesis Data Streams", a: "buffer order fan replay managed", r: { cost: 3, ops: 3 }, al: /Kinesis( Data Streams)?/i },
    mq: { n: "Amazon MQ", a: "buffer fan proto", r: { cost: 4, ops: 4 }, al: /Amazon MQ|ActiveMQ|RabbitMQ/i },
    sync: { n: "Llamadas HTTP síncronas directas entre los servicios", a: "", r: { cost: 1, ops: 1 }, al: /s[ií]ncronas|llamadas directas/i }
  },
  cons: {
    buffer: { t: "Si un sistema consumidor falla, los mensajes no deben perderse y deben esperar hasta ser procesados.", lbl: "Persistir hasta procesar", ok: has("buffer"), det: /no (se )?(deben )?perder|esperar hasta|consumidor(es)? fall/i,
      why: a => a.fan ? "entrega por push y no conserva el mensaje si el destino no está disponible" : "acopla los servicios: si uno falla, el mensaje se pierde" },
    order: { t: "Los mensajes de cada cliente deben procesarse estrictamente en el orden en que se enviaron.", lbl: "Orden estricto", ok: has("order"), det: /\borden\b|ordenad/i, why: "no garantiza el orden de los mensajes" },
    once: { t: "Un pago nunca debe procesarse dos veces.", lbl: "Sin duplicados", ok: has("once"), det: /dos veces|duplicad|exactly-once|exactamente una vez/i, why: "entrega al menos una vez y puede generar duplicados" },
    fan: { t: "Cada pedido debe llegar a tres sistemas independientes: facturación, inventario y analítica.", lbl: "Un mensaje, varios consumidores", ok: has("fan"), det: /(varios|tres|m[uú]ltiples) sistemas|debe llegar a (varios|tres)/i, why: "entrega cada mensaje a un solo consumidor" },
    replay: { t: "El equipo de analítica debe poder volver a procesar los eventos de las últimas 24 horas.", lbl: "Reprocesar eventos", ok: has("replay"), det: /volver a procesar|reprocesar|replay/i, why: "borra el mensaje una vez consumido y no permite reprocesarlo" },
    proto: { t: "Las aplicaciones existentes usan AMQP y JMS y no se pueden reescribir.", lbl: "Protocolos AMQP/JMS", ok: has("proto"), det: /AMQP|\bJMS\b|MQTT|STOMP/i, why: "no habla protocolos estándar como AMQP o JMS" },
    rules: { t: "Hay que reaccionar a eventos de una aplicación SaaS de terceros y enrutarlos según su contenido.", lbl: "Eventos SaaS + reglas", ok: has("rules"), det: /SaaS|seg[uú]n (su|el) contenido/i, why: "no recibe eventos de SaaS ni enruta con reglas por contenido" },
    managed: { t: "El equipo no quiere administrar brokers ni ventanas de mantenimiento.", lbl: "Sin brokers", ok: has("managed"), det: /brokers/i, why: "requiere brokers con instancias y ventanas de mantenimiento" }
  },
  rule: "Desacoplar y absorber picos → SQS. Orden + sin duplicados → SQS FIFO. Un mensaje a varios sistemas sin perderlo → SNS + SQS (fan-out). Reprocesar/streaming → Kinesis. AMQP/JMS existente → Amazon MQ. SaaS y reglas por contenido → EventBridge."
});

fam({ id: "tarea", t: "serverless", name: "Dónde ejecutar una tarea",
  ctx: ["{org} necesita ejecutar un proceso que transforma archivos que llegan a un bucket de S3.", "{org} está moviendo un proceso de su centro de datos a AWS."],
  ask: ["¿Dónde debe ejecutar el proceso el arquitecto de soluciones", "¿Qué servicio de cómputo debe usar"],
  goals: ["cost", "ops"],
  sols: {
    lambda: { n: "AWS Lambda", a: { dur: 15, nosrv: 1, idle0: 1 }, r: { cost: 1, ops: 1 }, al: /Lambda/i },
    fargate: { n: "Tareas de Amazon ECS en AWS Fargate", a: { dur: 1e9, nosrv: 1, idle0: 1 }, r: { cost: 2, ops: 2 }, al: /Fargate/i },
    ec2: { n: "Una flota de instancias EC2 On-Demand con Auto Scaling", a: { dur: 1e9, gpu: 1, os: 1 }, r: { cost: 3, ops: 4 }, al: /instancias EC2|EC2 On-Demand/i },
    batch: { n: "AWS Batch con entornos de cómputo administrados", a: { dur: 1e9, nosrv: 1, idle0: 1, gpu: 1, queue: 1 }, r: { cost: 2.5, ops: 2.5 }, al: /AWS Batch/i }
  },
  cons: {
    dur: { t: "Cada ejecución puede tardar hasta {p}.", lbl: "Duración larga", params: [{ v: 40, t: "40 minutos" }, { v: 60, t: "1 hora" }, { v: 120, t: "2 horas" }],
      ok: (a, v) => a.dur >= v, det: /\d+ (minutos|horas?)/i, parse: t => { const m = /(\d+) minutos/i.exec(t), h = /(\d+) horas?/i.exec(t); return m ? +m[1] : h ? +h[1] * 60 : null; }, why: "tiene un límite de 15 minutos por invocación" },
    nosrv: { t: "El equipo no quiere administrar servidores ni parchar sistemas operativos.", lbl: "Sin servidores", ok: has("nosrv"), det: /administrar servidores|parch/i, why: "obliga a administrar y parchar instancias" },
    idle0: { t: "Las ejecuciones son esporádicas y no debe haber costo cuando no hay trabajo.", lbl: "Sin costo en reposo", ok: has("idle0"), det: /espor[aá]dic|ocasional/i, why: "mantiene instancias encendidas que cuestan aunque no haya trabajo" },
    gpu: { t: "El procesamiento requiere GPU.", lbl: "GPU", ok: has("gpu"), det: /\bGPU/i, why: "no ofrece GPU" },
    queue: { t: "Hay miles de trabajos en cola con prioridades y dependencias entre ellos.", lbl: "Cola de trabajos", ok: has("queue"), det: /prioridades y dependencias|trabajos por lotes/i, why: "no administra colas de trabajos con prioridades ni dependencias" },
    os: { t: "El software necesita un módulo de kernel personalizado y acceso completo al sistema operativo de cada servidor.", lbl: "Control del SO", ok: has("os"), det: /kernel|acceso completo al sistema operativo/i, why: "no da acceso al sistema operativo subyacente" }
  },
  rule: "Hasta 15 min y por eventos → Lambda. Más de 15 min sin servidores → Fargate. Colas de trabajos por lotes (incluso con GPU) → AWS Batch. Control total del SO → EC2."
});

fam({ id: "orquestacion", t: "serverless", name: "Orquestación de flujos",
  ctx: ["{org} está automatizando un proceso de varios pasos que hoy se hace a mano.", "{org} tiene un proceso de negocio implementado con varias funciones Lambda."],
  ask: ["¿Qué debe usar el arquitecto de soluciones para coordinar los pasos", "¿Qué solución cumple estos requisitos"],
  goals: ["cost", "ops"],
  sols: {
    sfstd: { n: "Un flujo Standard de AWS Step Functions", a: "orch wait hist", r: { cost: 2, ops: 1 }, al: /Step Functions( Standard)?|flujo Standard/i },
    sfexp: { n: "Un flujo Express de AWS Step Functions", a: "orch hv", r: { cost: 1, ops: 1 }, al: /(Step Functions )?Express( Workflows?)?/i },
    chain: { n: "Funciones Lambda que se invocan directamente entre sí", a: "", r: { cost: 1, ops: 4 }, al: /se invocan (directamente )?entre s[ií]|invoca a la siguiente/i },
    sqsch: { n: "Colas de SQS entre cada paso, con funciones Lambda consumidoras", a: "", r: { cost: 1, ops: 3 }, al: /colas? de SQS entre/i },
    cron: { n: "Un script programado con cron en una instancia EC2", a: "", r: { cost: 2, ops: 5 }, al: /\bcron\b|script en (una )?instancia/i }
  },
  cons: {
    orch: { t: "El proceso tiene 6 pasos con reintentos, ramas condicionales y manejo de errores visible, sin programar esa lógica a mano.", lbl: "Orquestación sin código", anchor: 1, ok: has("orch"), det: /reintentos|manejo de errores|orquest/i, why: "obliga a programar reintentos, ramas y manejo de errores a mano" },
    wait: { t: "Un paso espera la aprobación de un gerente, que puede tardar hasta 5 días.", lbl: "Esperas de días", ok: has("wait"), det: /aprobaci[oó]n (humana|de un gerente|manual)|esperar?.{0,30}d[ií]as/i,
      why: a => a.orch ? "solo admite ejecuciones de hasta 5 minutos" : "no puede pausar el flujo durante días" },
    hist: { t: "Cada ejecución debe tener un historial auditable y no debe ejecutarse dos veces.", lbl: "Historial y exactly-once", ok: has("hist"), det: /historial|auditable|exactly-once/i,
      why: a => a.orch ? "tiene semántica at-least-once y no guarda el historial de ejecución en el servicio" : "no guarda un historial de cada ejecución" },
    hv: { t: "Se esperan más de 100 000 ejecuciones por segundo de flujos de menos de 1 minuto, provenientes de dispositivos IoT.", lbl: "Alto volumen, flujos cortos", ok: has("hv"), det: /IoT|000 (ejecuciones|eventos) por segundo/i,
      why: a => a.orch ? "tiene una tasa de inicio mucho menor y cobra por transición de estado, caro a este volumen" : "no orquesta pasos con este volumen de forma confiable" }
  },
  rule: "Flujos largos, aprobaciones humanas y auditoría → Step Functions Standard (hasta 1 año). Alto volumen y corto (hasta 5 min) → Express. Evita Lambdas que se invocan entre sí."
});

fam({ id: "api", t: "serverless", name: "Exponer APIs",
  ctx: ["{org} está construyendo un backend serverless con funciones Lambda.", "{org} quiere exponer su lógica de negocio en Lambda a clientes externos."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué opción cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    rest: { n: "Una REST API de Amazon API Gateway", a: "keys cache priv", r: { cost: 3 }, al: /REST API/i },
    http: { n: "Una HTTP API de Amazon API Gateway", a: "jwt", r: { cost: 1 }, al: /HTTP API/i },
    wsapi: { n: "Una WebSocket API de Amazon API Gateway", a: "ws", r: { cost: 2 }, al: /WebSocket API/i },
    appsync: { n: "AWS AppSync con una API GraphQL", a: "gql", r: { cost: 2 }, al: /AppSync|GraphQL/i },
    alb: { n: "Un Application Load Balancer con funciones Lambda como destino", a: "", r: { cost: 2 }, al: /Application Load Balancer|\bALB\b/i }
  },
  cons: {
    keys: { t: "Cada cliente externo debe usar una API key con su propio plan de uso y límite de solicitudes.", lbl: "API keys + planes de uso", ok: has("keys"), det: /API keys?|planes? de uso|usage plan/i, why: "no ofrece API keys ni planes de uso" },
    cache: { t: "Las respuestas frecuentes deben quedar en caché en la propia API para reducir invocaciones.", lbl: "Caché en la API", ok: has("cache"), det: /cach[eé].{0,30}API/i, why: "no incluye caché de respuestas" },
    priv: { t: "La API debe ser privada y accesible solo desde una VPC mediante un interface endpoint.", lbl: "API privada", ok: has("priv"), det: /API privada|solo desde (una|la) VPC/i, why: "no admite endpoints privados dentro de la VPC" },
    ws: { t: "Una aplicación de chat necesita conexiones bidireccionales persistentes con rutas por tipo de mensaje.", lbl: "Conexiones persistentes", ok: has("ws"), det: /WebSocket|bidireccional/i, why: "trabaja con solicitud/respuesta, no con conexiones persistentes" },
    gql: { t: "Las apps móviles deben pedir solo los campos que necesitan en una sola consulta y recibir actualizaciones en tiempo real.", lbl: "GraphQL", ok: has("gql"), det: /GraphQL|solo los campos/i, why: "no ofrece GraphQL ni suscripciones" },
    jwt: { t: "La API debe validar de forma nativa tokens JWT de cualquier proveedor OIDC.", lbl: "JWT nativo", ok: has("jwt"), det: /\bJWT\b|OIDC/i, why: "no tiene un autorizador JWT nativo para cualquier proveedor OIDC" }
  },
  rule: "API keys, planes de uso, caché o API privada → REST API. Lo más barato y JWT nativo → HTTP API. Conexiones persistentes → WebSocket API. GraphQL → AppSync."
});

fam({ id: "contenedores", t: "containers", name: "Plataforma de contenedores",
  ctx: ["{org} está migrando aplicaciones en contenedores a AWS.", "{org} empaquetó sus servicios en imágenes de Docker y quiere ejecutarlos en AWS."],
  ask: ["¿Qué plataforma debe usar el arquitecto de soluciones", "¿Qué opción cumple estos requisitos"],
  goals: ["ops", "cost"],
  sols: {
    ecsec2: { n: "Amazon ECS con launch type EC2", a: "gpu ri long workers", r: { ops: 3, cost: 2 }, al: /ECS.{0,30}(launch type )?EC2/i },
    ecsfg: { n: "Amazon ECS en AWS Fargate", a: "nonodes long workers", r: { ops: 2, cost: 3 }, al: /ECS.{0,30}Fargate/i },
    eksec2: { n: "Amazon EKS con grupos de nodos administrados", a: "k8s gpu ri long workers", r: { ops: 4, cost: 3 }, al: /EKS(?!.{0,30}Fargate)/i },
    eksfg: { n: "Amazon EKS en AWS Fargate", a: "k8s nonodes long workers", r: { ops: 3, cost: 4 }, al: /EKS.{0,30}Fargate/i },
    apprunner: { n: "AWS App Runner", a: "nonodes simple long", r: { ops: 1, cost: 3 }, al: /App Runner/i },
    lambdaimg: { n: "AWS Lambda con imágenes de contenedor", a: "nonodes", r: { ops: 1, cost: 1 }, al: /Lambda/i }
  },
  cons: {
    k8s: { t: "La empresa ya opera Kubernetes en sus centros de datos y quiere reutilizar sus manifiestos y charts de Helm.", lbl: "Kubernetes", ok: has("k8s"), det: /Kubernetes|Helm|kubectl/i, why: "no es Kubernetes: habría que rehacer los manifiestos" },
    nonodes: { t: "El equipo no quiere administrar, escalar ni parchar instancias para los nodos.", lbl: "Sin administrar nodos", ok: has("nonodes"), det: /no quiere administrar (instancias|servidores|nodos)|sin administrar (nodos|servidores|instancias)/i, why: "requiere administrar instancias EC2 como nodos" },
    gpu: { t: "Los contenedores necesitan GPU para inferencia.", lbl: "GPU", ok: has("gpu"), det: /\bGPU/i, why: "no ofrece GPU" },
    long: { t: "Los procesos corren de forma continua durante horas.", lbl: "Procesos largos", ok: has("long"), det: /de forma continua|durante horas/i, why: "tiene un límite de 15 minutos por ejecución" },
    simple: { t: "Un equipo sin experiencia en infraestructura debe publicar una app web desde una imagen, con HTTPS, balanceo y autoescalado incluidos, en minutos.", lbl: "Web lista en minutos", ok: has("simple"), det: /sin experiencia|en minutos|incluidos|sin configurar cl[uú]steres/i, why: "exige configurar por separado balanceador, escalado y red" },
    workers: { t: "Los contenedores son trabajadores que procesan mensajes de una cola durante horas; no exponen un servicio web.", lbl: "Trabajadores sin HTTP", ok: has("workers"), det: /trabajadores|procesan mensajes de una cola/i,
      why: a => a.simple ? "está pensado para servicios web HTTP, no para trabajadores de colas" : "tiene un límite de 15 minutos por ejecución" },
    ri: { t: "La carga es estable 24/7 y la empresa quiere aprovechar las instancias reservadas de EC2 que ya compró.", lbl: "Usar instancias reservadas", ok: has("ri"), det: /instancias reservadas|Reserved Instances/i, why: "no corre sobre instancias EC2 propias, así que no aprovecha las instancias reservadas" }
  },
  rule: "Kubernetes → EKS. Sin administrar nodos → Fargate (sin GPU). GPU o instancias reservadas → launch type EC2. Web simple de punta a punta → App Runner. Procesos largos ≠ Lambda."
});

fam({ id: "route53", t: "ha", name: "Políticas de enrutamiento de Route 53",
  ctx: ["{org} publica su aplicación en dos regiones de AWS y usa Amazon Route 53 como DNS.", "{org} usa Route 53 para dirigir a los usuarios a sus endpoints."],
  ask: ["¿Qué política de enrutamiento de Route 53 debe usar", "¿Qué configuración de Route 53 cumple estos requisitos"],
  sols: {
    simple: { n: "Enrutamiento simple", a: "", al: /enrutamiento simple|simple routing/i },
    weighted: { n: "Enrutamiento ponderado (weighted)", a: "health split", al: /ponderad|weighted/i },
    latency: { n: "Enrutamiento por latencia", a: "health lat", al: /por latencia|latency/i },
    failover: { n: "Enrutamiento por conmutación (failover)", a: "health ap", al: /failover|conmutaci[oó]n/i },
    geoloc: { n: "Enrutamiento por geolocalización", a: "health country", al: /geolocalizaci[oó]n|geolocation/i },
    geoprox: { n: "Enrutamiento por geoproximidad", a: "health bias", al: /geoproximidad|geoproximity/i },
    multival: { n: "Respuesta de varios valores (multivalue answer)", a: "health multiip", al: /varios valores|multivalue/i }
  },
  cons: {
    canary: { t: "Se debe enviar el 10% del tráfico a la nueva versión y el 90% a la actual.", lbl: "Repartir por porcentaje", ok: has("split"), det: /\d+ ?% del tr[aá]fico|canary/i, why: "no reparte el tráfico por porcentajes" },
    lat: { t: "Cada usuario debe llegar a la región que le ofrezca la menor latencia.", lbl: "Menor latencia", ok: has("lat"), det: /menor latencia/i, why: "no decide según la latencia medida" },
    ap: { t: "El sitio secundario solo debe recibir tráfico si el primario deja de responder.", lbl: "Activo-pasivo", ok: has("ap"), det: /deja de responder|activo-pasivo|solo (si|cuando).{0,30}falla/i, why: "no implementa una configuración activo-pasivo" },
    country: { t: "Por un requisito legal, los usuarios de Alemania deben ser atendidos solo desde la región de Frankfurt.", lbl: "Por país", ok: has("country"), det: /requisito legal|usuarios de (Alemania|Europa|[A-Z][a-z]+) deben/i, why: "no enruta según el país del usuario" },
    bias: { t: "Se quiere ampliar gradualmente el área geográfica que atiende una región ajustando un sesgo.", lbl: "Sesgo geográfico", ok: has("bias"), det: /\bbias\b|sesgo/i, why: "no permite ajustar un sesgo geográfico" },
    multi: { t: "Se deben devolver hasta 8 direcciones IP saludables al azar, sin usar un balanceador.", lbl: "Varias IP saludables", ok: has("multiip"), det: /hasta 8|varias direcciones IP/i, why: "no devuelve varias IP verificadas con health checks" },
    health: { t: "Las respuestas deben excluir automáticamente los endpoints que no estén saludables.", lbl: "Health checks", ok: has("health"), det: /saludables|health checks?/i, why: "no admite health checks" }
  },
  rule: "% del tráfico → weighted; latencia → latency; activo-pasivo → failover; país o requisito legal → geolocation; mover tráfico con bias → geoproximity; varias IP sanas sin ELB → multivalue."
});

fam({ id: "dr", t: "dr", name: "Estrategias de recuperación ante desastres",
  ctx: ["{org} ejecuta una aplicación crítica en una región de AWS y necesita un plan de recuperación ante desastres.", "{org} debe definir su estrategia de DR para cumplir una nueva regulación."],
  ask: ["¿Qué estrategia de DR debe recomendar el arquitecto de soluciones", "¿Qué solución cumple estos objetivos"],
  goals: ["cost"], goalAlways: "cost",
  sols: {
    br: { n: "Backup and restore: respaldos copiados a otra región y restauración ante el desastre", a: { rto: 600, rpo: 240 }, r: { cost: 1 }, al: /backup and restore|respaldo y restauraci[oó]n/i },
    pilot: { n: "Pilot light: base de datos replicada y servidores apagados listos para encenderse", a: { rto: 45, rpo: 1 }, r: { cost: 2 }, al: /pilot light/i },
    drs: { n: "AWS Elastic Disaster Recovery con replicación continua a nivel de bloque", a: { rto: 20, rpo: 0.1, onprem: 1 }, r: { cost: 2.5 }, al: /Elastic Disaster Recovery|\bDRS\b/i },
    warm: { n: "Warm standby: una copia reducida de todo el entorno funcionando siempre", a: { rto: 10, rpo: 0.5 }, r: { cost: 3 }, al: /warm standby/i },
    active: { n: "Multi-site activo-activo en dos regiones", a: { rto: 0.5, rpo: 0.01 }, r: { cost: 4 }, al: /activo-activo|multi-site|active-active/i }
  },
  cons: {
    rto: { t: "El RTO debe ser menor a {p}.", lbl: "RTO", params: [{ v: 1440, t: "24 horas" }, { v: 60, t: "1 hora" }, { v: 15, t: "15 minutos" }, { v: 1, t: "1 minuto" }],
      ok: (a, v) => a.rto <= v, det: /\bRTO\b/i, parse: t => { const m = /RTO[^.]{0,25}?(\d+) (minutos|horas)/i.exec(t); return m ? +m[1] * (/hora/i.test(m[2]) ? 60 : 1) : null; }, why: a => "tiene un RTO típico de " + fmtMin(a.rto) },
    rpo: { t: "El RPO debe ser menor a {p}.", lbl: "RPO", params: [{ v: 1440, t: "24 horas" }, { v: 5, t: "5 minutos" }, { v: 0.05, t: "unos pocos segundos" }],
      ok: (a, v) => a.rpo <= v, det: /\bRPO\b/i, parse: t => { const m = /RPO[^.]{0,25}?(\d+) (minutos|horas)/i.exec(t); return m ? +m[1] * (/hora/i.test(m[2]) ? 60 : 1) : null; }, why: a => "tiene un RPO típico de " + fmtMin(a.rpo) },
    onprem: { t: "Se deben proteger 150 servidores físicos y VMware del centro de datos local, replicándolos continuamente hacia AWS.", lbl: "Servidores locales", ok: has("onprem"), det: /servidores (f[ií]sicos|locales)|VMware/i, why: "no replica servidores locales a nivel de bloque" }
  },
  rule: "De más barato a más rápido: Backup & restore (horas) → Pilot light (decenas de minutos) → Warm standby (minutos) → Multi-site (casi cero). Elige el más barato que cumpla el RTO y el RPO."
});

fam({ id: "respaldo", t: "dr", name: "Respaldos",
  ctx: ["{org} necesita ordenar sus respaldos en AWS.", "{org} descubrió que cada equipo respalda sus recursos de forma distinta."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["cost", "ops"],
  sols: {
    backup: { n: "AWS Backup con planes de respaldo, copia entre regiones y Vault Lock", a: "central ebs pitr lock", r: { cost: 2, ops: 1 }, al: /AWS Backup/i },
    dlm: { n: "Amazon Data Lifecycle Manager para instantáneas de EBS", a: "ebs", r: { cost: 1, ops: 1 }, al: /Data Lifecycle Manager|\bDLM\b/i },
    script: { n: "Un script programado en EC2 que llama a la API de instantáneas", a: "ebs", r: { cost: 1.5, ops: 4 }, al: /script/i },
    rdsauto: { n: "Los respaldos automáticos de Amazon RDS", a: "pitr", r: { cost: 1, ops: 1 }, al: /respaldos autom[aá]ticos|automated backups/i },
    manual: { n: "Instantáneas manuales de RDS tomadas cada noche", a: "", r: { cost: 1, ops: 3 }, al: /instant[aá]neas manuales|snapshots manuales/i }
  },
  cons: {
    central: { t: "Se necesitan políticas de respaldo centralizadas para EC2, EBS, RDS, DynamoDB y EFS en varias cuentas.", lbl: "Central y multiservicio", ok: has("central"), det: /centraliz|DynamoDB y EFS/i, why: "cubre un solo servicio o hay que configurarlo cuenta por cuenta" },
    ebs: { t: "Se deben respaldar los volúmenes EBS según sus etiquetas.", lbl: "EBS por etiquetas", ok: has("ebs"), det: /vol[uú]menes EBS/i, why: "no administra instantáneas de EBS" },
    pitr: { t: "Se debe poder restaurar la base de datos RDS a cualquier segundo de los últimos 7 días.", lbl: "Point-in-time", ok: has("pitr"), det: /cualquier (segundo|momento|punto)|point-in-time/i, why: "solo restaura al momento de cada instantánea, no a cualquier segundo" },
    lock: { t: "Las copias deben ser inmutables: ni siquiera un administrador puede borrarlas antes de tiempo.", lbl: "Copias inmutables", ok: has("lock"), det: /inmutables?|Vault Lock/i, why: "no ofrece un bloqueo WORM para las copias" }
  },
  rule: "Respaldos centralizados de muchos servicios y cuentas, con Vault Lock → AWS Backup. Solo EBS por etiquetas sin costo extra → Data Lifecycle Manager. Point-in-time de RDS → respaldos automáticos (hasta 35 días)."
});

fam({ id: "bdha", t: "dbha", name: "Bases de datos resilientes",
  ctx: ["{org} ejecuta su aplicación principal sobre una base de datos en AWS.", "{org} sufrió una caída de su base de datos y quiere evitar que se repita."],
  ask: ["¿Qué debe implementar el arquitecto de soluciones", "¿Qué solución de base de datos cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    maz: { n: "Amazon RDS Multi-AZ con una instancia standby síncrona", a: "sql fail rdseng", r: { cost: 2 }, al: /Multi-AZ(?! (DB )?cluster)/i },
    mazc: { n: "Amazon RDS Multi-AZ DB cluster con dos standby legibles", a: "sql fail read rdseng", r: { cost: 3 }, al: /Multi-AZ (DB )?cluster|standby legibles/i },
    rr: { n: "Una réplica de lectura de RDS en la misma región", a: "sql read rdseng", r: { cost: 2 }, al: /r[eé]plicas? de lectura(?!.{0,20}(otra regi[oó]n|entre regiones))|read replicas?/i },
    crr: { n: "Una réplica de lectura de RDS en otra región", a: "sql read region rdseng", r: { cost: 3 }, al: /r[eé]plicas? de lectura.{0,20}(otra regi[oó]n|entre regiones)|cross-region read replica/i },
    aurora: { n: "Amazon Aurora con réplicas en varias AZ", a: "sql fail read many", r: { cost: 3 }, al: /Aurora(?! Global| Serverless)/i },
    global: { n: "Amazon Aurora Global Database", a: "sql fail read region rpo1 many", r: { cost: 4 }, al: /Aurora Global|Global Database/i },
    ddbgt: { n: "Tablas globales de Amazon DynamoDB", a: "fail read region rpo1 mw", r: { cost: 3 }, al: /tablas globales|global tables/i },
    proxy: { n: "Amazon RDS Proxy", a: "sql pool rdseng", r: { cost: 2 }, al: /RDS Proxy/i }
  },
  cons: {
    sql: { t: "La aplicación usa SQL relacional con joins complejos y transacciones.", lbl: "Relacional", ok: has("sql"), det: /relacional|joins?/i, why: "es NoSQL clave-valor: no admite joins SQL" },
    fail: { t: "Si falla una AZ, la base de datos debe conmutar automáticamente sin cambiar la cadena de conexión.", lbl: "Failover automático", ok: has("fail"), det: /conmut(e|ar)? autom|failover autom|falla (de )?(una|la) (AZ|zona)/i,
      why: a => a.pool ? "administra conexiones; no replica datos" : "hay que promoverla manualmente: no hay failover automático" },
    read: { t: "Las consultas de reportes están saturando la instancia principal.", lbl: "Escalar lecturas", ok: has("read"), det: /reportes|consultas de lectura|saturan?d?o?/i,
      why: a => a.fail ? "su standby no atiende lecturas" : "no agrega capacidad de lectura" },
    region: { t: "La base de datos debe sobrevivir a la caída de una región completa.", lbl: "Sobrevivir a una región", ok: has("region"), det: /regi[oó]n completa|ca[ií]da de (una|la) regi[oó]n/i, why: "opera dentro de una sola región" },
    rpo1: { t: "Entre regiones se exige un RPO de alrededor de 1 segundo y un RTO cercano a 1 minuto.", lbl: "RPO ~1 s entre regiones", ok: has("rpo1"), det: /RPO.{0,30}segundo/i,
      why: a => a.region ? "su replicación asíncrona y su promoción manual no garantizan un RPO de 1 s con RTO de 1 minuto" : "no replica a otra región" },
    mw: { t: "Usuarios de tres continentes deben escribir con baja latencia en su región local.", lbl: "Escrituras multirregión", ok: has("mw"), det: /escribi?r?.{0,40}(varias regiones|regi[oó]n local)|escrituras.{0,50}varias regiones|activo-activo|multi-?activ/i, why: "acepta escrituras en una sola región" },
    rdseng: { t: "La empresa quiere seguir usando su motor actual de RDS for PostgreSQL sin migrar a Aurora.", lbl: "Seguir en RDS", ok: has("rdseng"), det: /sin migrar a Aurora/i, why: a => a.region || a.mw ? "implica migrar a otro motor o servicio" : "implica migrar a Aurora o a otro servicio" },
    many: { t: "Se necesitan hasta 15 réplicas de lectura con failover en menos de 30 segundos y un volumen que crezca solo.", lbl: "15 réplicas + failover rápido", ok: has("many"), det: /15 r[eé]plicas/i, why: a => a.sql ? "admite menos réplicas y su failover es más lento" : "no es un clúster relacional con réplicas" },
    pool: { t: "Miles de funciones Lambda abren conexiones y agotan el límite de conexiones de la base.", lbl: "Agrupar conexiones", ok: has("pool"), det: /agotan?.{0,40}conexiones|demasiadas conexiones|too many connections/i, why: "no agrupa ni reutiliza conexiones" }
  },
  rule: "Multi-AZ = alta disponibilidad (el standby no lee). Réplicas = escalar lecturas. Otra región → réplica entre regiones o Aurora Global (RPO ~1 s, RTO ~1 min). Escrituras en varias regiones → DynamoDB global tables. Muchas conexiones desde Lambda → RDS Proxy."
});

/* ═════════════════════════ DOMINIO 3 · ALTO RENDIMIENTO ═════════════════════════ */

fam({ id: "almacenamiento", t: "storage", name: "Elegir almacenamiento",
  ctx: ["{org} está migrando a AWS una aplicación que procesa archivos de gran tamaño.", "{org} está diseñando la capa de almacenamiento de una nueva aplicación en EC2."],
  ask: ["¿Qué servicio de almacenamiento debe usar el arquitecto de soluciones", "¿Qué solución de almacenamiento cumple estos requisitos"],
  goals: ["cost", "ops"],
  sols: {
    gp3: { n: "Volúmenes Amazon EBS gp3", a: { kind: "block", persist: 1, iops: 16000, boot: 1 }, r: { cost: 2, ops: 1 }, al: /\bgp3\b|\bgp2\b/i },
    io2: { n: "Volúmenes Amazon EBS io2 Block Express", a: { kind: "block", persist: 1, iops: 256000, boot: 1 }, r: { cost: 4, ops: 1 }, al: /\bio2\b|\bio1\b|Provisioned IOPS/i },
    inst: { n: "El instance store de la instancia", a: { kind: "block", persist: 0, iops: 1e7 }, r: { cost: 1, ops: 2 }, al: /instance store/i },
    efs: { n: "Amazon EFS", a: { kind: "file", persist: 1, shared: 1, maz: 1, linux: 1 }, r: { cost: 3, ops: 1 }, al: /\bEFS\b|Elastic File System/i },
    fsxw: { n: "Amazon FSx for Windows File Server", a: { kind: "file", persist: 1, shared: 1, maz: 1, win: 1, ad: 1 }, r: { cost: 4, ops: 1 }, al: /FSx (for|para) Windows/i },
    lustre: { n: "Amazon FSx for Lustre", a: { kind: "file", persist: 1, shared: 1, linux: 1, hpc: 1 }, r: { cost: 4, ops: 2 }, al: /Lustre/i },
    ontap: { n: "Amazon FSx for NetApp ONTAP", a: { kind: "file", persist: 1, shared: 1, maz: 1, linux: 1, win: 1, ad: 1, multiproto: 1 }, r: { cost: 5, ops: 2 }, al: /ONTAP/i },
    s3: { n: "Amazon S3", a: { kind: "object", persist: 1, maz: 1, http: 1 }, r: { cost: 1, ops: 1 }, al: /\bS3\b/i }
  },
  cons: {
    linuxshared: { t: "Cientos de instancias Linux deben montar el mismo sistema de archivos POSIX al mismo tiempo.", lbl: "POSIX compartido (Linux)", ok: a => a.kind === "file" && !!a.linux, det: /POSIX|\bNFS\b/i,
      why: a => a.kind === "object" ? "es almacenamiento de objetos: no se monta como sistema de archivos POSIX" : a.kind === "block" ? "es almacenamiento de bloques ligado a una instancia" : "no ofrece NFS para Linux" },
    smb: { t: "Servidores Windows necesitan recursos compartidos SMB integrados con Active Directory.", lbl: "SMB + Active Directory", ok: a => !!a.win && !!a.ad, det: /\bSMB\b|Windows File|Active Directory/i, why: "no ofrece recursos compartidos SMB con Active Directory" },
    hpc: { t: "Un trabajo HPC necesita cientos de GB/s de rendimiento y leer directamente los datos de un bucket de S3.", lbl: "HPC enlazado a S3", ok: has("hpc"), det: /\bHPC\b|GB\/s/i, why: "no está diseñado para HPC con integración nativa con S3" },
    multiproto: { t: "Los mismos datos deben ser accesibles por NFS desde Linux y por SMB desde Windows.", lbl: "NFS + SMB", ok: has("multiproto"), det: /NFS y SMB|SMB y NFS|multiprotocolo/i, why: "no sirve los mismos datos por NFS y SMB a la vez" },
    hiops: { t: "La aplicación necesita la mayor cantidad de IOPS posible con latencia mínima.", lbl: "Máximas IOPS", ok: a => a.kind === "block" && a.iops >= 1e6, det: /alt[ií]simas IOPS|m[aá]xim[oa]s? IOPS|mayor cantidad de IOPS/i, why: a => a.kind === "block" ? "no alcanza el rendimiento de los discos NVMe locales" : "no es almacenamiento de bloques local de latencia mínima" },
    persist: { t: "Los datos deben conservarse si la instancia se detiene o se reemplaza.", lbl: "Persistente", ok: has("persist"), det: /conservarse|persist/i, why: "es efímero: se pierde al detener o reemplazar la instancia" },
    iops: { t: "Una base de datos en una sola instancia EC2 necesita {p} IOPS sostenidas con latencia de submilisegundos.", lbl: "IOPS de bloque", params: [{ v: 64000, t: "64 000" }, { v: 100000, t: "100 000" }],
      ok: (a, v) => a.kind === "block" && a.iops >= v, det: /\d+[ .,]?000 IOPS/i, parse: t => { const m = /(\d+)[ .,]?000 IOPS/i.exec(t); return m ? +m[1] * 1000 : null; },
      why: a => a.kind === "block" ? "llega como máximo a " + a.iops.toLocaleString("es-PE") + " IOPS por volumen" : "no es almacenamiento de bloques de baja latencia para una base de datos" },
    maz: { t: "Los datos deben seguir disponibles aunque falle una zona de disponibilidad.", lbl: "Resiste falla de AZ", ok: has("maz"), det: /falle una (zona|AZ)|varias AZ/i, why: "vive en una sola AZ" },
    http: { t: "Millones de imágenes deben servirse por HTTP a una aplicación web, con 11 nueves de durabilidad.", lbl: "Objetos por HTTP", ok: has("http"), det: /11 nueves|millones de (im[aá]genes|objetos)/i, why: "no sirve objetos por HTTP con 11 nueves de durabilidad" },
    boot: { t: "Se necesita el volumen raíz de arranque de las instancias.", lbl: "Volumen de arranque", ok: has("boot"), det: /arranque|volumen ra[ií]z/i, why: "no puede ser el volumen raíz persistente de una instancia" }
  },
  implicit: [{ c: "persist", waiver: "Los datos son temporales (caché y archivos intermedios) y se pueden perder sin problema.", wdet: /regenerar|temporal|pueden perderse|se pueden perder/i }],
  rule: "Bloques para una instancia → EBS (gp3 hasta 16 000 IOPS; io2 para más). Temporal y rapidísimo → instance store. Linux compartido → EFS. Windows/SMB + AD → FSx for Windows. HPC + S3 → FSx for Lustre. NFS + SMB → FSx for ONTAP. Objetos → S3."
});

fam({ id: "tipoinst", t: "compute", name: "Familias de instancias EC2",
  ctx: ["{org} está eligiendo instancias EC2 para una nueva carga de trabajo.", "{org} quiere ajustar el tipo de instancia de una aplicación que migró a AWS."],
  ask: ["¿Qué familia de instancias debe elegir el arquitecto de soluciones", "¿Qué tipo de instancia EC2 es el más adecuado"],
  sols: {
    m: { n: "Instancias de propósito general (familia M)", a: "balanced", al: /prop[oó]sito general|\bM[5-8][a-z]*\b/ },
    c: { n: "Instancias optimizadas para cómputo (familia C)", a: "cpu", al: /optimizadas? para c[oó]mputo|\bC[5-8][a-z]*\b/ },
    r: { n: "Instancias optimizadas para memoria (familias R y X)", a: "mem", al: /optimizadas? para memoria|\bR[5-8][a-z]*\b|\bX[12][a-z]*\b/ },
    i: { n: "Instancias optimizadas para almacenamiento (familia I)", a: "io", al: /optimizadas? para almacenamiento|\bI[34][a-z]*\b/ },
    p: { n: "Instancias de cómputo acelerado (familias P y G)", a: "gpu", al: /c[oó]mputo acelerado|\bP[3-5][a-z]*\b|\bG[4-6][a-z]*\b/ },
    t: { n: "Instancias burstable (familia T)", a: "burst", al: /burstable|\bT[34][a-z]*\b/ }
  },
  cons: {
    cpu: { t: "La aplicación codifica video y ejecuta modelos científicos limitados por CPU.", lbl: "Limitada por CPU", ok: has("cpu"), det: /limitad[oa]s? por (la )?CPU|codifica(ci[oó]n)? (de )?video/i, why: "no prioriza la potencia de CPU por dólar" },
    mem: { t: "Una base de datos en memoria necesita cientos de GB de RAM por instancia.", lbl: "Mucha memoria", ok: has("mem"), det: /en memoria|GB de RAM|SAP HANA/i, why: "no ofrece la mayor proporción de memoria por vCPU" },
    io: { t: "Una base NoSQL autoadministrada necesita altísimas IOPS en discos NVMe locales.", lbl: "IOPS locales", ok: has("io"), det: /NVMe|IOPS (locales|en disco local)/i, why: "no está optimizada para E/S local de alto rendimiento" },
    gpu: { t: "Se entrenarán modelos de machine learning de gran tamaño.", lbl: "GPU", ok: has("gpu"), det: /machine learning|\bGPU/i, why: "no tiene aceleradores GPU" },
    burst: { t: "El servidor usa poca CPU casi todo el tiempo, con picos cortos ocasionales, y se busca el menor costo.", lbl: "Picos ocasionales", ok: has("burst"), det: /picos (cortos|ocasionales)|CPU baja/i, why: "cobra capacidad constante que casi no se usa" },
    balanced: { t: "Una aplicación web tiene un uso equilibrado de CPU, memoria y red.", lbl: "Uso equilibrado", ok: has("balanced"), det: /equilibrad/i, why: "está especializada en un solo recurso y desperdicia el resto" }
  },
  rule: "C = CPU, R/X = RAM, I = IOPS locales, P/G = GPU, T = picos ocasionales, M = equilibrado."
});

fam({ id: "placement", t: "compute", name: "Placement groups",
  ctx: ["{org} está desplegando un clúster de instancias EC2.", "{org} necesita controlar cómo se colocan sus instancias EC2 en el hardware de AWS."],
  ask: ["¿Qué estrategia de colocación debe usar el arquitecto de soluciones", "¿Qué opción cumple estos requisitos"],
  sols: {
    cluster: { n: "Un placement group de tipo cluster", a: "lowlat large", al: /(placement group|grupo de colocaci[oó]n).{0,20}cluster|tipo cluster|cluster placement/i },
    spread: { n: "Un placement group de tipo spread", a: "isolate maz", al: /spread/i },
    partition: { n: "Un placement group de tipo partition", a: "topo maz large", al: /partition|partici[oó]n/i },
    dedhost: { n: "Hosts dedicados", a: "license", al: /hosts? dedicados?|Dedicated Hosts?/i },
    none: { n: "Instancias en una sola AZ sin placement group", a: "large", al: /sin placement group/i }
  },
  cons: {
    lowlat: { t: "Los nodos HPC necesitan la menor latencia y el mayor ancho de banda posible entre ellos.", lbl: "Latencia mínima entre nodos", ok: has("lowlat"), det: /ancho de banda entre|latencia.{0,30}entre (ellos|nodos|instancias)/i, why: "no garantiza que las instancias queden cerca entre sí en la red" },
    isolate: { t: "Siete instancias críticas nunca deben compartir el mismo hardware subyacente.", lbl: "Hardware distinto por instancia", ok: has("isolate"), det: /mismo hardware|hardware subyacente|falla de hardware/i,
      why: a => a.topo ? "aísla grupos de instancias (particiones), no cada instancia" : "puede colocar varias instancias en el mismo hardware" },
    topo: { t: "Cientos de nodos de HDFS y Cassandra deben repartirse en grupos que no compartan racks, y la aplicación debe saber en qué grupo está cada nodo.", lbl: "Particiones por rack", ok: has("topo"), det: /HDFS|Cassandra|Kafka|racks/i, why: "no expone particiones de racks a la aplicación" },
    large: { t: "El grupo tendrá cientos de instancias.", lbl: "Cientos de instancias", ok: has("large"), det: /cientos de (instancias|nodos)/i, why: "admite como máximo 7 instancias por AZ" },
    maz: { t: "Las instancias deben repartirse en varias zonas de disponibilidad.", lbl: "Varias AZ", ok: has("maz"), det: /varias (zonas|AZ)/i, why: "funciona dentro de una sola AZ" },
    license: { t: "El software usa licencias por socket físico.", lbl: "Licencias por socket", ok: has("license"), det: /socket|BYOL/i, why: "no da visibilidad de sockets físicos" }
  },
  rule: "Cluster = baja latencia en una AZ. Spread = máximo 7 por AZ, cada una en hardware distinto. Partition = grupos de racks para HDFS, Cassandra o Kafka. Licencias por socket → hosts dedicados."
});

fam({ id: "escalado", t: "compute", name: "Políticas de Auto Scaling",
  ctx: ["{org} ejecuta una aplicación web en un grupo de Auto Scaling detrás de un Application Load Balancer.", "{org} quiere que su flota de EC2 se ajuste sola a la demanda."],
  ask: ["¿Qué política de escalado debe configurar el arquitecto de soluciones", "¿Qué tipo de escalado cumple estos requisitos"],
  sols: {
    tt: { n: "Una política de target tracking", a: "keep queue", al: /target tracking|seguimiento de objetivo/i },
    step: { n: "Una política de step scaling", a: "steps", al: /step scaling|por pasos/i },
    sched: { n: "Una acción de escalado programada", a: "known once", al: /programad|scheduled/i },
    pred: { n: "Predictive scaling", a: "known ml", al: /predictive|predictiv/i },
    simple: { n: "Una política de escalado simple con cooldown", a: "", al: /escalado simple|simple scaling/i },
    manual: { n: "Ajustar la capacidad deseada a mano cuando haga falta", a: "", al: /a mano|manualmente/i }
  },
  cons: {
    keep: { t: "El uso promedio de CPU debe mantenerse cerca del 50% con la menor configuración posible.", lbl: "Mantener una métrica", ok: has("keep"), det: /mantener.{0,40}%|valor objetivo/i, why: "no mantiene una métrica en un valor objetivo por sí sola" },
    steps: { t: "Se deben agregar 2 instancias al pasar el 70% de CPU y 4 instancias al pasar el 90%.", lbl: "Escalones por magnitud", ok: has("steps"), det: /agregar \d+ instancias.{0,60}y \d+/i, why: "no aplica ajustes distintos según la magnitud de la alarma" },
    known: { t: "Hay un pico de tráfico que se conoce de antemano.", lbl: "Pico conocido", ok: has("known"), det: /conocido de antemano|todos los (lunes|d[ií]as)|predecible/i, why: "reacciona después de que la carga ya llegó" },
    once: { t: "El pico es un evento único (el lanzamiento de un producto) del que no hay historial.", lbl: "Evento único", ok: has("once"), det: /evento [uú]nico|lanzamiento/i,
      why: a => a.ml ? "necesita historial de carga para pronosticar" : "no aumenta la capacidad antes del evento" },
    ml: { t: "El tráfico sigue patrones diarios recurrentes y se quiere escalar antes de que llegue la carga usando el historial, sin definir horarios.", lbl: "Pronóstico con historial", ok: has("ml"), det: /patrones (diarios|recurrentes)|pron[oó]stic/i, why: "no aprende de los patrones históricos" },
    queue: { t: "Los trabajadores deben escalar según la cantidad de mensajes de SQS pendientes por instancia.", lbl: "Backlog por instancia", ok: has("queue"), det: /mensajes.{0,40}por instancia|backlog/i, why: "no ajusta la capacidad a un objetivo de mensajes por instancia" }
  },
  rule: "Mantener una métrica → target tracking. Escalones → step scaling. Horario conocido o evento único → acción programada. Patrones recurrentes con historial → predictive. Colas de SQS → target tracking sobre el backlog por instancia."
});

fam({ id: "bdperf", t: "dbperf", name: "Bases de datos y caché de alto rendimiento",
  ctx: ["{org} tiene problemas de rendimiento en la capa de datos de su aplicación.", "{org} está eligiendo la base de datos para un nuevo producto digital."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué solución de datos cumple estos requisitos"],
  sols: {
    redis: { n: "Amazon ElastiCache (Redis OSS o Valkey)", a: "session leader cache", al: /Redis|Valkey/i },
    memc: { n: "Amazon ElastiCache for Memcached", a: "simple cache", al: /Memcached/i },
    dax: { n: "Amazon DynamoDB Accelerator (DAX)", a: "micro", al: /\bDAX\b|DynamoDB Accelerator/i },
    ddb: { n: "Amazon DynamoDB", a: "kv", al: /DynamoDB(?! Accelerator)/i },
    redshift: { n: "Amazon Redshift", a: "olap", al: /Redshift/i },
    os: { n: "Amazon OpenSearch Service", a: "search", al: /OpenSearch|Elasticsearch/i },
    neptune: { n: "Amazon Neptune", a: "graph", al: /Neptune/i },
    asv2: { n: "Amazon Aurora Serverless v2", a: "var", al: /Aurora Serverless/i },
    rr: { n: "Réplicas de lectura de Amazon RDS", a: "reports", al: /r[eé]plicas? de lectura|read replicas?/i },
    docdb: { n: "Amazon DocumentDB (compatible con MongoDB)", a: "mongo", al: /DocumentDB/i },
    keyspaces: { n: "Amazon Keyspaces (para Apache Cassandra)", a: "cql", al: /Keyspaces/i }
  },
  cons: {
    micro: { t: "Las lecturas de una tabla de DynamoDB deben bajar de milisegundos a microsegundos sin reescribir la lógica de la aplicación.", lbl: "Microsegundos en DynamoDB", ok: has("micro"), det: /microsegundos/i, why: "no es una caché compatible con la API de DynamoDB" },
    session: { t: "Las sesiones de usuario deben guardarse en memoria con replicación, persistencia y failover automático.", lbl: "Sesiones con alta disponibilidad", ok: has("session"), det: /sesiones/i, why: "no ofrece replicación, persistencia ni failover en memoria" },
    simple: { t: "Se necesita una caché en memoria simple y multihilo, sin persistencia ni replicación.", lbl: "Caché simple multihilo", ok: has("simple"), det: /multihilo|multi-?thread/i, why: "no es la caché simple y multihilo que se pide" },
    leader: { t: "Se necesita una tabla de clasificación en tiempo real ordenada por puntaje.", lbl: "Leaderboard", ok: has("leader"), det: /clasificaci[oó]n|leaderboard|ranking/i, why: "no tiene estructuras ordenadas en memoria (sorted sets)" },
    kv: { t: "La aplicación necesita millones de solicitudes por segundo con acceso clave-valor, sin administrar servidores.", lbl: "Clave-valor a escala", ok: has("kv"), det: /clave-valor|key-value/i, why: "no es una base clave-valor serverless que escale a millones de solicitudes" },
    olap: { t: "Los analistas ejecutan consultas complejas sobre petabytes de datos históricos.", lbl: "Analítica (OLAP)", ok: has("olap"), det: /petabytes|data warehouse|anal[ií]tic/i, why: "no es un data warehouse columnar para analítica" },
    search: { t: "Los usuarios deben buscar productos por texto libre, con relevancia y tolerancia a errores de escritura.", lbl: "Búsqueda de texto", ok: has("search"), det: /texto libre|b[uú]squeda de texto|full-text/i, why: "no ofrece búsqueda de texto completo con relevancia" },
    graph: { t: "Se deben consultar relaciones de varios niveles, como «amigos de amigos», en una red social.", lbl: "Grafos", ok: has("graph"), det: /amigos de amigos|grafo|red social/i, why: "no es una base de datos de grafos" },
    var: { t: "Una base relacional tiene carga muy variable e impredecible y debe escalar en segundos sin administrar capacidad.", lbl: "Relacional elástica", ok: has("var"), det: /impredecible|escalar en segundos/i, why: "no ajusta la capacidad relacional en segundos de forma automática" },
    mongo: { t: "La aplicación usa MongoDB con documentos JSON y se quiere un servicio administrado compatible sin reescribir el código.", lbl: "Compatible con MongoDB", ok: has("mongo"), det: /MongoDB|documentos JSON/i, why: "no es compatible con la API de MongoDB" },
    cql: { t: "Las aplicaciones usan Apache Cassandra y CQL y se quiere un servicio serverless compatible.", lbl: "Compatible con Cassandra", ok: has("cql"), det: /Cassandra|\bCQL\b/i, why: "no es compatible con Cassandra ni CQL" },
    reports: { t: "Las consultas de reportes saturan una base RDS MySQL y pueden tolerar segundos de retraso.", lbl: "Descargar reportes", ok: has("reports"), det: /reportes.{0,40}(saturan|RDS)/i, why: "no descarga las lecturas de la instancia RDS principal" }
  },
  rule: "Microsegundos en DynamoDB → DAX. Sesiones con HA y leaderboards → ElastiCache Redis/Valkey. Caché simple multihilo → Memcached. Clave-valor masivo → DynamoDB. Analítica → Redshift. Texto → OpenSearch. Grafos → Neptune. Relacional variable → Aurora Serverless v2. MongoDB → DocumentDB. Cassandra → Keyspaces."
});

fam({ id: "edge", t: "edge", name: "Edge y balanceo de carga",
  ctx: ["{org} tiene usuarios en todo el mundo y quiere mejorar el rendimiento de su aplicación.", "{org} está rediseñando cómo llega el tráfico a su aplicación en AWS."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    cf: { n: "Amazon CloudFront", a: "cache global", r: { cost: 2 }, al: /CloudFront/i },
    ga: { n: "AWS Global Accelerator", a: "global staticip udp fastfail", r: { cost: 3 }, al: /Global Accelerator/i },
    alb: { n: "Un Application Load Balancer", a: "path", r: { cost: 2 }, al: /Application Load Balancer|\bALB\b/i },
    nlb: { n: "Un Network Load Balancer", a: "udp staticip mtcp", r: { cost: 2 }, al: /Network Load Balancer|\bNLB\b/i },
    s3ta: { n: "S3 Transfer Acceleration", a: "global upload", r: { cost: 2 }, al: /Transfer Acceleration/i },
    r53lat: { n: "Registros de Route 53 con enrutamiento por latencia", a: "global dns", r: { cost: 1 }, al: /Route 53/i }
  },
  cons: {
    cache: { t: "El contenido estático y dinámico debe servirse a usuarios de todo el mundo con caché en ubicaciones de borde.", lbl: "Caché en el borde", ok: has("cache"), det: /cach[eé]|contenido est[aá]tico|est[aá]ticos/i, why: "no guarda contenido en caché" },
    staticip: { t: "Los clientes corporativos solo permiten en su firewall dos direcciones IP fijas para una aplicación desplegada en varias regiones.", lbl: "IP fijas globales", ok: a => !!a.staticip && !!a.global, det: /IP (fijas|est[aá]ticas)|dos direcciones IP/i,
      why: a => a.staticip ? "ofrece IP fijas por AZ, pero solo dentro de una región" : "no ofrece direcciones IP fijas anycast" },
    udp: { t: "Un juego multijugador usa tráfico UDP y tiene jugadores en todo el mundo.", lbl: "UDP global", ok: a => !!a.udp && !!a.global, det: /\bUDP\b/i,
      why: a => a.udp ? "soporta UDP, pero es regional y no acelera a jugadores de otros continentes" : "no soporta tráfico UDP" },
    path: { t: "Las solicitudes a /api y a /imagenes deben ir a grupos de destinos distintos dentro de una región.", lbl: "Enrutar por ruta", ok: has("path"), det: /\/api|path-based|host-based|por ruta/i, why: "no enruta por la ruta de la URL hacia grupos de destinos" },
    mtcp: { t: "Se necesitan millones de conexiones TCP por segundo con latencia ultrabaja dentro de una región.", lbl: "Millones de conexiones TCP", ok: has("mtcp"), det: /millones de (conexiones|solicitudes).{0,20}por segundo|latencia ultrabaja/i, why: "no está optimizado para millones de conexiones TCP con latencia ultrabaja" },
    upload: { t: "Usuarios de otros continentes suben archivos grandes directamente a un bucket de S3 y las cargas son lentas.", lbl: "Subidas lejanas a S3", ok: has("upload"), det: /sub(en|ir|idas?).{0,40}(a|al) (un )?bucket|cargas.{0,20}lentas/i, why: "no acelera las subidas directas a un bucket de S3" },
    fastfail: { t: "Si una región falla, el tráfico debe moverse a otra en segundos, sin depender de la caché DNS de los clientes.", lbl: "Failover sin DNS", ok: has("fastfail"), det: /cach[eé] DNS|TTL/i,
      why: a => a.dns ? "depende de la caché DNS de los clientes (TTL)" : "no conmuta tráfico entre regiones" }
  },
  rule: "Caché → CloudFront. IP fijas, UDP global o failover sin DNS → Global Accelerator. Rutas /api → ALB. Millones de conexiones TCP/UDP en una región → NLB. Subidas lejanas a S3 → Transfer Acceleration."
});

fam({ id: "hibrida", t: "network", name: "Conectividad de red",
  ctx: ["{org} está conectando su infraestructura con AWS.", "{org} está rediseñando la red que une sus VPC y su centro de datos."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué solución de conectividad cumple estos requisitos"],
  goals: ["cost"],
  sols: {
    vpn: { n: "AWS Site-to-Site VPN", a: "hybrid enc fast", r: { cost: 1 }, al: /Site-to-Site VPN|VPN (de sitio a sitio|site-to-site)|VPN IPsec|\bVPN\b/i },
    dx: { n: "AWS Direct Connect", a: "hybrid dedicated", r: { cost: 3 }, al: /Direct Connect/i },
    dxvpn: { n: "AWS Direct Connect con una VPN IPsec sobre la conexión", a: "hybrid dedicated enc", r: { cost: 4 }, al: /Direct Connect.{0,40}VPN|VPN.{0,40}Direct Connect/i },
    tgw: { n: "AWS Transit Gateway", a: "hub two", r: { cost: 3 }, al: /Transit Gateway/i },
    peering: { n: "VPC peering", a: "two", r: { cost: 1 }, al: /peering/i },
    pl: { n: "AWS PrivateLink (endpoint service con un Network Load Balancer)", a: "expose", r: { cost: 2 }, al: /PrivateLink|endpoint service/i },
    cvpn: { n: "AWS Client VPN", a: "remote enc fast", r: { cost: 2 }, al: /Client VPN/i }
  },
  cons: {
    hybrid: { t: "La VPC debe conectarse con el centro de datos local.", lbl: "Centro de datos ↔ VPC", grp: "scope", anchor: 1, ok: has("hybrid"), det: /centro de datos|on-premises|Direct Connect/i, why: "no conecta un centro de datos con la VPC" },
    dedicated: { t: "Se requiere ancho de banda dedicado y latencia constante, sin pasar por internet.", lbl: "Privado y constante", ok: has("dedicated"), det: /ancho de banda dedicado|latencia constante|sin pasar por internet/i, why: "viaja por internet, con latencia variable" },
    enc: { t: "Todo el tráfico entre ambos sitios debe ir cifrado.", lbl: "Cifrado", ok: has("enc"), det: /cifrad/i, why: "no cifra el tráfico por sí solo" },
    fast: { t: "La conexión debe estar lista en pocos días.", lbl: "Lista en días", ok: has("fast"), det: /(pocos|unos) d[ií]as|de inmediato/i, why: "puede tardar semanas en aprovisionarse" },
    hub: { t: "Hay 60 VPC y la red local que deben comunicarse entre sí con enrutamiento transitivo administrado de forma central.", lbl: "Hub transitivo", grp: "scope", anchor: 1, ok: has("hub"), det: /\d{2,} VPC|transitiv/i,
      why: a => a.two ? "no es transitivo: requeriría cientos de conexiones en malla" : "no interconecta muchas VPC entre sí" },
    two: { t: "Solo dos VPC de la misma región deben comunicarse entre sí.", lbl: "Dos VPC", grp: "scope", anchor: 1, ok: has("two"), det: /dos VPC/i, why: "no conecta dos VPC entre sí" },
    expose: { t: "Un proveedor SaaS debe exponer un servicio a cientos de VPC de clientes con rangos CIDR superpuestos, sin abrir el resto de su red.", lbl: "Exponer un servicio", grp: "scope", anchor: 1, ok: has("expose"), det: /CIDR superpuestos|se superponen|superpuest|exponer un servicio/i, why: "expone redes completas y no funciona con CIDR superpuestos" },
    remote: { t: "Cientos de empleados remotos deben conectarse desde sus laptops.", lbl: "Usuarios remotos", grp: "scope", anchor: 1, ok: has("remote"), det: /remotos|laptops/i, why: "conecta redes, no usuarios individuales" }
  },
  rule: "Rápido y cifrado → Site-to-Site VPN. Dedicado y constante → Direct Connect (+ VPN si debe ir cifrado). Muchas VPC transitivas → Transit Gateway. Dos VPC → peering. Exponer un servicio con CIDR superpuestos → PrivateLink. Usuarios remotos → Client VPN."
});

fam({ id: "datos", t: "data", name: "Ingesta, streaming y analítica",
  ctx: ["{org} está construyendo una plataforma de datos en AWS.", "{org} quiere aprovechar los datos de clics y transacciones que genera su aplicación."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué servicio de AWS cumple estos requisitos"],
  goals: ["ops"],
  sols: {
    kds: { n: "Amazon Kinesis Data Streams", a: "rt", r: { ops: 2 }, al: /Kinesis Data Streams/i },
    fh: { n: "Amazon Data Firehose", a: "deliver", r: { ops: 1 }, al: /Firehose/i },
    flink: { n: "Amazon Managed Service for Apache Flink", a: "window", r: { ops: 2 }, al: /Flink|Kinesis Data Analytics/i },
    msk: { n: "Amazon MSK", a: "rt kafka", r: { ops: 3 }, al: /\bMSK\b|Managed Streaming for (Apache )?Kafka/i },
    glue: { n: "AWS Glue", a: "etl", r: { ops: 1 }, al: /\bGlue\b/i },
    athena: { n: "Amazon Athena", a: "sql", r: { ops: 1 }, al: /Athena/i },
    emr: { n: "Amazon EMR", a: "spark", r: { ops: 3 }, al: /\bEMR\b/i },
    redshift: { n: "Amazon Redshift", a: "dw", r: { ops: 2 }, al: /Redshift/i },
    qs: { n: "Amazon QuickSight (Amazon Quick)", a: "bi", r: { ops: 1 }, al: /QuickSight|Amazon Quick/i },
    dx: { n: "AWS Data Exchange", a: "thirdparty", r: { ops: 1 }, al: /Data Exchange/i },
    appflow: { n: "Amazon AppFlow", a: "saasflow", r: { ops: 1 }, al: /AppFlow/i },
    lf: { n: "AWS Lake Formation", a: "gov", r: { ops: 1 }, al: /Lake Formation/i }
  },
  cons: {
    rt: { t: "Varias aplicaciones deben leer el mismo flujo de clics en tiempo real y poder reprocesar datos de días anteriores.", lbl: "Stream con varios consumidores", ok: has("rt"), det: /tiempo real.{0,60}(varias|reprocesar)|varias aplicaciones.{0,40}(leer|consumir)/i, why: "no guarda un stream que varias aplicaciones puedan leer y releer" },
    deliver: { t: "Los datos de streaming deben entregarse casi en tiempo real a S3, Redshift u OpenSearch sin escribir consumidores.", lbl: "Entrega sin código", ok: has("deliver"), det: /sin escribir consumidores|c[oó]digo de consumidores|casi en tiempo real.{0,40}(S3|Redshift)/i, why: "exige escribir y operar consumidores" },
    window: { t: "Se deben calcular agregaciones por ventanas de tiempo sobre el stream, en tiempo real, con SQL o Java.", lbl: "Ventanas de tiempo", ok: has("window"), det: /ventanas? de tiempo/i, why: "no procesa streams con ventanas de tiempo" },
    kafka: { t: "Las aplicaciones existentes usan las API de Apache Kafka y no se deben reescribir.", lbl: "Compatibilidad con Kafka", ok: has("kafka"), det: /Kafka/i, why: "no es compatible con las API de Kafka" },
    sql: { t: "Se necesitan consultas SQL ad hoc sobre archivos en S3, pagando solo por los datos escaneados y sin infraestructura.", lbl: "SQL sobre S3", ok: has("sql"), det: /ad hoc|datos escaneados/i, why: "no consulta S3 con SQL pagando por consulta" },
    etl: { t: "Se necesita ETL serverless con un catálogo de datos y crawlers que descubran los esquemas.", lbl: "ETL + catálogo", ok: has("etl"), det: /\bETL\b|crawlers?|cat[aá]logo de datos/i, why: "no ofrece ETL serverless con catálogo y crawlers" },
    spark: { t: "Hay que ejecutar trabajos existentes de Spark y Hadoop con control sobre el clúster.", lbl: "Spark/Hadoop", ok: has("spark"), det: /Spark|Hadoop/i, why: "no ejecuta clústeres de Spark y Hadoop bajo tu control" },
    dw: { t: "Se necesita un data warehouse para consultas complejas y repetitivas de muchos usuarios de BI.", lbl: "Data warehouse", ok: has("dw"), det: /data warehouse/i, why: "no es un data warehouse" },
    bi: { t: "Los ejecutivos necesitan dashboards interactivos.", lbl: "Dashboards", ok: has("bi"), det: /dashboards?|tableros/i, why: "no crea dashboards de BI" },
    thirdparty: { t: "Los analistas deben encontrar y suscribirse a conjuntos de datos de terceros, como datos financieros, y recibirlos directamente en S3.", lbl: "Datos de terceros", ok: has("thirdparty"), det: /datos de terceros|suscribirse a (conjuntos de )?datos/i, why: "no ofrece un catálogo de datos de terceros para suscribirse" },
    saasflow: { t: "Los datos de Salesforce y otras aplicaciones SaaS deben copiarse a S3 o Redshift de forma programada y sin código.", lbl: "SaaS a AWS sin código", ok: has("saasflow"), det: /Salesforce|SaaS.{0,40}(S3|Redshift)/i, why: "no integra aplicaciones SaaS con AWS sin código" },
    gov: { t: "Se requieren permisos a nivel de columna y de fila administrados de forma central sobre el data lake.", lbl: "Gobierno del data lake", ok: has("gov"), det: /nivel de (columna|fila)/i, why: "no administra permisos finos sobre el data lake" }
  },
  rule: "Stream con varios consumidores y replay → Kinesis Data Streams (o MSK si ya usan Kafka). Entregar a S3/Redshift sin código → Firehose. Ventanas en tiempo real → Flink. SQL sobre S3 → Athena. ETL + catálogo → Glue. Spark/Hadoop → EMR. Warehouse → Redshift. Dashboards → QuickSight. Permisos finos → Lake Formation. Datos de terceros → Data Exchange. Salesforce/SaaS → AppFlow."
});

fam({ id: "migracion", t: "migrate", name: "Migración y transferencia",
  ctx: ["{org} está migrando su centro de datos a AWS.", "{org} debe mover datos y aplicaciones locales a AWS este trimestre."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué servicio de AWS cumple estos requisitos"],
  goals: ["ops"],
  sols: {
    datasync: { n: "AWS DataSync", a: "online", r: { ops: 1 }, al: /DataSync/i },
    snow: { n: "AWS Snowball Edge", a: "offline", r: { ops: 2 }, al: /Snowball/i },
    transfer: { n: "AWS Transfer Family", a: "sftp", r: { ops: 1 }, al: /Transfer Family/i },
    fgw: { n: "Amazon S3 File Gateway", a: "cache", r: { ops: 2 }, al: /File Gateway/i },
    tgw: { n: "Tape Gateway de AWS Storage Gateway", a: "tape", r: { ops: 2 }, al: /Tape Gateway/i },
    dms: { n: "AWS DMS", a: "homo cdc", r: { ops: 1 }, al: /\bDMS\b(?!.{0,30}(SCT|Schema Conversion))|Database Migration Service/i },
    dmssct: { n: "AWS DMS junto con AWS Schema Conversion Tool", a: "homo hetero cdc", r: { ops: 2 }, al: /\bSCT\b|Schema Conversion/i },
    mgn: { n: "AWS Application Migration Service (MGN)", a: "servers", r: { ops: 1 }, al: /Application Migration Service|\bMGN\b/i }
  },
  cons: {
    online: { t: "Se deben transferir 50 TB desde un NAS local por la red, con programación, verificación de integridad y cifrado automáticos.", lbl: "Transferencia en línea", ok: has("online"), det: /por la red|verificaci[oó]n de integridad/i, why: "no automatiza transferencias en línea desde un NAS" },
    offline: { t: "Hay que mover {p} con un enlace a internet de 100 Mbps y deben estar en AWS en menos de 2 semanas.", lbl: "Volumen imposible por red", params: [{ v: 80, t: "80 TB" }, { v: 200, t: "200 TB" }],
      ok: has("offline"), det: /Mbps/i, parse: t => { const m = /(\d+) TB/i.exec(t); return m ? +m[1] : null; }, why: a => a.online ? "a 100 Mbps se mueve como mucho ~1 TB por día: tardaría meses" : "no resuelve el traslado físico de un volumen tan grande" },
    sftp: { t: "Socios externos suben archivos por SFTP y deben quedar en S3 sin que cambien sus clientes.", lbl: "SFTP a S3", ok: has("sftp"), det: /SFTP|FTPS/i, why: "no ofrece un endpoint SFTP administrado" },
    cache: { t: "Los servidores locales deben seguir usando NFS o SMB, pero los archivos deben guardarse en S3 con caché local de lo más usado.", lbl: "NFS/SMB local hacia S3", ok: has("cache"), det: /cach[eé] local|NFS.{0,80}objetos en S3/i, why: "no presenta S3 como recurso compartido local con caché" },
    tape: { t: "El software de respaldo actual escribe en cintas y se quiere eliminar las cintas físicas sin cambiarlo.", lbl: "Reemplazar cintas", ok: has("tape"), det: /cintas?/i, why: "no emula una biblioteca de cintas" },
    homo: { t: "Una base de datos local debe migrarse a AWS con mínima inactividad.", lbl: "Migrar una base de datos", grp: "db", anchor: 1, ok: has("homo"), det: /migrar.{0,40}base de datos/i, why: "no migra bases de datos" },
    hetero: { t: "El motor de origen es Oracle y el destino será Aurora PostgreSQL.", lbl: "Motor distinto", ok: has("hetero"), det: /Oracle.{0,40}(Aurora|PostgreSQL)|SQL Server.{0,40}(Aurora|MySQL|PostgreSQL)/i, why: "migra los datos, pero no convierte el esquema ni el código entre motores distintos" },
    cdc: { t: "Durante la migración la base de origen debe seguir operando y los cambios deben replicarse continuamente.", lbl: "Replicación continua (CDC)", ok: has("cdc"), det: /replicarse continuamente|\bCDC\b/i, why: "no replica cambios continuos de una base de datos" },
    servers: { t: "Se deben rehospedar 200 servidores VMware en EC2 con replicación continua y un corte en minutos.", lbl: "Rehospedar servidores", ok: has("servers"), det: /rehosped|lift.and.shift/i, why: "no replica servidores completos hacia EC2" }
  },
  rule: "Por red con programación → DataSync. Demasiados TB para el enlace → Snowball Edge. SFTP → Transfer Family. NFS/SMB local con S3 → File Gateway. Cintas → Tape Gateway. BD del mismo motor → DMS; motor distinto → DMS + SCT. Servidores completos → Application Migration Service."
});

/* ═════════════════════════ DOMINIO 4 · COSTOS ═════════════════════════ */

const S3P = { // precio aprox. us-east-1, USD por GB-mes / por GB recuperado
  std: { st: 0.023, rt: 0, min: 0 }, it: { st: 0.023, rt: 0, min: 0 }, ia: { st: 0.0125, rt: 0.01, min: 30 }, oz: { st: 0.01, rt: 0.01, min: 30 },
  gir: { st: 0.004, rt: 0.03, min: 90 }, gfr: { st: 0.0036, rt: 0.01, min: 90 }, gda: { st: 0.00099, rt: 0.02, min: 180 }
};
fam({ id: "costos3", t: "coststorage", name: "Clases de almacenamiento de S3",
  ctx: ["{org} guarda 500 TB de archivos en Amazon S3 Standard y la factura no deja de crecer.", "{org} está definiendo la clase de almacenamiento para un nuevo repositorio de documentos en S3."],
  ask: ["¿Qué clase de almacenamiento debe usar el arquitecto de soluciones", "¿Qué clase de S3 cumple estos requisitos"],
  goals: ["cost"], goalAlways: "cost",
  costFn: (id, P) => {
    const f = P.freq != null ? P.freq : 1, life = P.life != null ? P.life : 36, p = S3P[id];
    let st = p.st;
    if (id === "it") st = f >= 1 ? 0.023 : f >= 0.2 ? 0.0125 : 0.004;
    const minFactor = Math.max(1, (p.min / 30) / life);
    return st * minFactor + p.rt * f + (id === "it" ? 0.0003 : 0);
  },
  costLbl: "USD por GB-mes (aprox., us-east-1)",
  sols: {
    std: { n: "S3 Standard", a: { ret: 0, maz: 1 }, al: /S3 Standard(?!-IA| IA)|Standard(?!-IA| IA)/i },
    it: { n: "S3 Intelligent-Tiering", a: { ret: 0, maz: 1, auto: 1 }, al: /Intelligent-Tiering/i },
    ia: { n: "S3 Standard-IA", a: { ret: 0, maz: 1 }, al: /Standard-IA|Standard IA/i },
    oz: { n: "S3 One Zone-IA", a: { ret: 0, maz: 0 }, al: /One Zone/i },
    gir: { n: "S3 Glacier Instant Retrieval", a: { ret: 0, maz: 1 }, al: /Glacier Instant/i },
    gfr: { n: "S3 Glacier Flexible Retrieval", a: { ret: 300, maz: 1 }, al: /Glacier Flexible|Glacier(?! (Instant|Deep))/i },
    gda: { n: "S3 Glacier Deep Archive", a: { ret: 720, maz: 1 }, al: /Deep Archive/i }
  },
  cons: {
    ret: { t: "Cuando se solicita un archivo, debe estar disponible {p}.", lbl: "Tiempo de recuperación", params: [{ v: 0, t: "en milisegundos" }, { v: 360, t: "en menos de 6 horas" }, { v: 720, t: "en menos de 12 horas" }, { v: 2880, t: "en menos de 48 horas" }],
      ok: (a, v) => a.ret <= v, det: /milisegundos|inmediat|\d+ horas/i, parse: t => { if (/milisegundos|inmediat/i.test(t)) return 0; const m = /(\d+) horas/i.exec(t); return m ? +m[1] * 60 : null; }, why: a => a.ret >= 720 ? "tarda hasta 12 horas en una recuperación estándar" : "tarda de 3 a 5 horas en una recuperación estándar" },
    unknown: { t: "El patrón de acceso es impredecible y cambia de un objeto a otro; no se quieren cargos por recuperación.", lbl: "Patrón desconocido", grp: "freq", ok: has("auto"), det: /impredecible|desconocido|cambia/i,
      why: a => a.ret === 0 && a.maz && !a.auto ? "obliga a adivinar el patrón: cobra la tarifa alta o cargos por recuperación según el caso" : "cobra por recuperación y obliga a adivinar el patrón de acceso" },
    freq: { t: "Los datos {p}.", lbl: "Frecuencia de acceso", grp: "freq", fact: 1, parse: t => /todos los d[ií]as|diari|con frecuencia/i.test(t) ? 30 : /una vez al mes|mensual/i.test(t) ? 1 : /casi nunca|solo se conservan/i.test(t) ? 0.01 : /pocas veces al a[nñ]o|trimestr|rara vez|acceden poco|se usan? poco/i.test(t) ? 0.25 : null, params: [{ v: 30, t: "se leen todos los días" }, { v: 1, t: "se consultan aproximadamente una vez al mes" }, { v: 0.25, t: "se consultan unas pocas veces al año" }, { v: 0.01, t: "casi nunca se leen y solo se conservan por cumplimiento" }] },
    life: { t: "Cada objeto se elimina {p} después de crearse.", lbl: "Vida del objeto", fact: 1, params: [{ v: 0.33, t: "10 días" }, { v: 1.5, t: "45 días" }, { v: 36, t: "3 años" }] }
  },
  implicit: [{ c: "maz3", waiver: "Los archivos son copias que se pueden regenerar fácilmente si se pierden.", wdet: /regenerar|recrear|reproducir/i }],
  extra: { maz3: { t: "", lbl: "Resistir la pérdida de una AZ", ok: has("maz"), why: "guarda los datos en una sola AZ: solo es aceptable si se pueden regenerar" } },
  rule: "Frecuente → Standard. Patrón desconocido → Intelligent-Tiering. Mensual con acceso inmediato → Standard-IA. Trimestral con acceso inmediato → Glacier Instant Retrieval. Horas → Flexible Retrieval. 12-48 h y casi nunca → Deep Archive. Cuidado con la duración mínima (30/90/180 días) y con One Zone (solo datos que se pueden regenerar)."
});

fam({ id: "costoec2", t: "costcompute", name: "Modelos de compra de EC2",
  ctx: ["{org} quiere reducir la factura de EC2 de una carga de trabajo.", "{org} está eligiendo el modelo de compra para una flota de instancias EC2."],
  ask: ["¿Qué modelo de compra debe recomendar el arquitecto de soluciones", "¿Qué opción cumple estos requisitos"],
  goals: ["cost"], goalAlways: "cost",
  sols: {
    od: { n: "Instancias On-Demand", a: "", r: { cost: 1 }, al: /On-Demand(?! Capacity)/i },
    spot: { n: "Instancias Spot", a: "interrupt", r: { cost: 0.3 }, al: /\bSpot\b/i },
    ri3: { n: "Instancias reservadas Standard por 3 años", a: "commit", r: { cost: 0.4 }, al: /reservadas? Standard|Standard Reserved|instancias reservadas(?! Convertible)|Reserved Instances(?! Convertible)/i },
    convri: { n: "Instancias reservadas Convertible por 3 años", a: "commit famflex", r: { cost: 0.46 }, al: /Convertible/i },
    csp: { n: "Un Compute Savings Plan por 3 años", a: "commit famflex fargate", r: { cost: 0.47 }, al: /Compute Savings Plans?/i },
    dhost: { n: "Dedicated Hosts", a: "socket", r: { cost: 1.3 }, al: /Dedicated Hosts?|hosts? dedicados?/i },
    odcr: { n: "Una On-Demand Capacity Reservation", a: "capacity", r: { cost: 1.05 }, al: /Capacity Reservation|reserva de capacidad/i }
  },
  cons: {
    famflex: { t: "La empresa planea cambiar de familia de instancias y de región durante el período.", lbl: "Cambiar de familia y región", ok: has("famflex"), det: /cambiar de familia|otra familia/i, why: "queda atada a una familia de instancias en una región" },
    fargate: { t: "Parte de la carga se moverá a AWS Fargate y AWS Lambda el próximo año.", lbl: "También Fargate/Lambda", ok: has("fargate"), det: /Fargate|Lambda/i, why: "su descuento solo aplica a EC2" },
    short: { t: "El proyecto durará solo 3 meses.", lbl: "Corto plazo", grp: "term", ok: a => !a.commit, det: /(\d|unos|pocos) meses|temporal/i, why: "exige un compromiso de 1 o 3 años" },
    socket: { t: "Las licencias existentes de Windows Server y SQL Server son por socket físico (BYOL).", lbl: "Licencias por socket", ok: has("socket"), det: /socket|BYOL|n[uú]cleo f[ií]sico/i, why: "no da visibilidad de sockets ni núcleos físicos" },
    capacity: { t: "Se necesita capacidad garantizada en una AZ específica durante un evento de 2 semanas, sin compromiso de largo plazo.", lbl: "Capacidad garantizada", ok: has("capacity"), det: /capacidad garantizada|garantizar (la )?capacidad/i,
      why: a => a.interrupt ? "puede interrumpirse y no garantiza capacidad" : a.commit ? "exige un compromiso de años" : "no reserva capacidad en una AZ" },
    noint: { t: "Los servidores atienden transacciones que no pueden interrumpirse.", lbl: "Sin interrupciones", ok: a => !a.interrupt, det: /no pueden? interrumpirse|sin interrupciones/i, why: "AWS puede recuperar la instancia con 2 minutos de aviso" }
  },
  implicit: [
    { c: "longterm", waiver: "La carga es estable 24/7 y seguirá así al menos 3 años.", wdet: /24\/7|constante|estable|[13] años/i },
    { c: "tolerant", waiver: "Los trabajos son tolerantes a fallos: si se interrumpen, continúan desde un checkpoint.", wdet: /interrump|toleran?|reiniciarse/i }
  ],
  extra: {
    longterm: { t: "", lbl: "Uso a largo plazo garantizado", ok: a => !a.commit, why: "exige comprometer 3 años de uso que el escenario no garantiza" },
    tolerant: { t: "", lbl: "Tolera interrupciones", ok: a => !a.interrupt, why: "puede ser interrumpida en cualquier momento y el escenario no lo tolera" }
  },
  rule: "Estable por años → RI o Savings Plans (Compute SP si cambiarás de familia, región o a Fargate/Lambda). Tolerante a interrupciones → Spot. Corto plazo → On-Demand (+ Capacity Reservation si necesitas capacidad garantizada). Licencias por socket → Dedicated Hosts."
});

fam({ id: "costobd", t: "costdb", name: "Costos de bases de datos",
  ctx: ["{org} quiere bajar el costo de sus bases de datos en AWS.", "{org} está revisando la factura de sus bases de datos con el equipo de finanzas."],
  ask: ["¿Qué opción debe recomendar el arquitecto de soluciones", "¿Qué configuración cumple estos requisitos"],
  goals: ["cost"], goalAlways: "cost",
  sols: {
    rdsod: { n: "Amazon RDS con instancias On-Demand", a: "rel steady", r: { cost: 3 }, al: /RDS.{0,20}On-Demand/i },
    rdsri: { n: "Amazon RDS con instancias reservadas por 3 años", a: "rel steady commit", r: { cost: 1 }, al: /RDS.{0,30}reservadas|Reserved DB/i },
    asv2: { n: "Amazon Aurora Serverless v2", a: "rel spiky idle", r: { cost: 3 }, al: /Aurora Serverless/i },
    aurorastd: { n: "Amazon Aurora con la configuración Standard", a: "rel steady", r: { cost: 3.2 }, al: /Aurora Standard/i },
    auroraio: { n: "Amazon Aurora I/O-Optimized", a: "rel steady io", r: { cost: 3.3 }, al: /I\/O-Optimized/i },
    ddbod: { n: "DynamoDB en modo de capacidad on-demand", a: "nosql steady spiky", r: { cost: 3 }, al: /DynamoDB.{0,30}on-demand/i },
    ddbprov: { n: "DynamoDB en modo aprovisionado con auto scaling", a: "nosql steady", r: { cost: 2 }, al: /DynamoDB.{0,30}aprovisionad|provisioned/i },
    ddbres: { n: "DynamoDB aprovisionado con capacidad reservada", a: "nosql steady commit", r: { cost: 1 }, al: /capacidad reservada|reserved capacity/i }
  },
  cons: {
    rel: { t: "La aplicación usa una base de datos relacional compatible con MySQL.", lbl: "Relacional", grp: "kind", anchor: 1, ok: has("rel"), det: /MySQL|PostgreSQL|relacional/i, why: "no es una base relacional" },
    nosql: { t: "La aplicación usa una tabla de Amazon DynamoDB.", lbl: "DynamoDB", grp: "kind", anchor: 1, ok: has("nosql"), det: /DynamoDB/i, why: "no es DynamoDB" },
    spiky: { t: "El tráfico es impredecible, con picos repentinos y periodos sin uso, y nadie quiere planificar capacidad.", lbl: "Picos impredecibles", grp: "load", ok: has("spiky"), det: /impredecible|picos repentinos/i,
      why: a => a.commit ? "paga capacidad fija comprometida que se desperdicia en los periodos sin uso" : "hay que planificar capacidad y el auto scaling reacciona con retraso ante picos repentinos" },
    steady: { t: "El tráfico es estable y predecible las 24 horas.", lbl: "Carga estable", grp: "load", ok: has("steady"), det: /estable y predecible|24\/7/i, why: "está pensado para cargas variables y cuesta más con tráfico constante" },
    idle: { t: "Es una base de desarrollo que solo se usa en horario laboral y pasa noches y fines de semana inactiva.", lbl: "Inactiva muchas horas", grp: "load", ok: has("idle"), det: /horario laboral|fines de semana/i, why: "cobra cada hora aunque nadie la use" },
    io: { t: "El costo de E/S del clúster de Aurora supera el 25% de la factura de la base de datos.", lbl: "E/S intensiva", ok: has("io"), det: /E\/S|I\/O/i, why: "cobra cada operación de E/S por separado" }
  },
  implicit: [{ c: "longterm", waiver: "La carga seguirá igual durante al menos 3 años.", wdet: /[13] años|todo el año|estable/i }],
  extra: { longterm: { t: "", lbl: "Uso a largo plazo garantizado", ok: a => !a.commit, why: "exige comprometer 3 años que el escenario no garantiza" } },
  rule: "Estable por años → instancias reservadas o capacidad reservada. Estable sin compromiso → aprovisionado (DynamoDB) o instancias On-Demand. Picos impredecibles → on-demand (DynamoDB) o Aurora Serverless v2. Inactiva por horas → Aurora Serverless v2. E/S > 25% → Aurora I/O-Optimized."
});

fam({ id: "costored", t: "costnet", name: "Costos de red y transferencia",
  ctx: ["{org} encontró que la transferencia de datos es la segunda línea más alta de su factura de AWS.", "{org} quiere optimizar los costos de red de su arquitectura."],
  ask: ["¿Qué debe hacer el arquitecto de soluciones", "¿Qué cambio reduce más el costo"],
  goals: ["cost"], goalAlways: "cost",
  sols: {
    gwep: { n: "Agregar un gateway VPC endpoint", a: "s3", r: { cost: 1 }, al: /gateway (VPC )?endpoint|endpoint de (tipo )?gateway/i },
    ifep: { n: "Agregar interface VPC endpoints (PrivateLink)", a: "s3 svc", r: { cost: 2 }, al: /interface (VPC )?endpoints?|endpoints? de interfaz/i },
    nat: { n: "Agregar más NAT gateways, uno por AZ", a: "s3 svc", r: { cost: 4 }, al: /NAT gateways?/i },
    cf: { n: "Poner Amazon CloudFront delante del origen", a: "egress", r: { cost: 1 }, al: /CloudFront/i },
    peering: { n: "Conectar las VPC con VPC peering", a: "two", r: { cost: 1 }, al: /peering/i },
    tgw: { n: "Conectar las VPC con AWS Transit Gateway", a: "two", r: { cost: 3 }, al: /Transit Gateway/i },
    dx: { n: "Contratar AWS Direct Connect", a: "onprem egress0", r: { cost: 2 }, al: /Direct Connect/i }
  },
  cons: {
    s3: { t: "Instancias en subredes privadas transfieren decenas de TB al mes hacia Amazon S3 a través de un NAT gateway.", lbl: "Tráfico privado hacia S3", grp: "scope", anchor: 1, ok: has("s3"), det: /NAT gateway.{0,60}S3|S3.{0,60}NAT/i, why: "no cambia la ruta del tráfico hacia S3" },
    svc: { t: "Instancias privadas deben llamar a Amazon SQS y AWS KMS sin pasar por internet.", lbl: "Otros servicios en privado", grp: "scope", anchor: 1, ok: has("svc"), det: /SQS y (AWS )?KMS|sin pasar por internet/i,
      why: a => a.s3 ? "los gateway endpoints solo existen para S3 y DynamoDB" : "no da acceso privado a servicios de AWS" },
    egress: { t: "Usuarios de todo el mundo descargan mucho contenido estático desde instancias EC2 y el costo de transferencia a internet es alto.", lbl: "Salida a internet", grp: "scope", anchor: 1, ok: has("egress"), det: /transferencia a internet|descargan mucho contenido/i, why: "no reduce la transferencia de datos a internet" },
    two: { t: "Dos VPC de la misma región intercambian mucho tráfico entre sí.", lbl: "Tráfico entre dos VPC", grp: "scope", anchor: 1, ok: has("two"), det: /dos VPC/i, why: "no conecta VPC entre sí" },
    onprem: { t: "Cada mes se envían cientos de TB desde AWS al centro de datos de forma constante.", lbl: "Salida constante al centro de datos", grp: "scope", anchor: 1, ok: has("onprem"), det: /al centro de datos|hacia el centro de datos/i, why: "no ofrece una tarifa de salida menor hacia el centro de datos" }
  },
  rule: "S3/DynamoDB desde subredes privadas → gateway endpoint (gratis). Otros servicios en privado → interface endpoint. Mucha descarga a internet → CloudFront. Dos VPC → peering (sin cargo por hora). Salida masiva al centro de datos → Direct Connect."
});

fam({ id: "herramientascosto", t: "costtools", name: "Herramientas de gestión de costos",
  ctx: ["El equipo de finanzas de {orgl} quiere más control sobre el gasto en AWS.", "{org} quiere implementar prácticas de FinOps en sus cuentas de AWS."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué herramienta de AWS cumple este requisito"],
  sols: {
    budgets: { n: "AWS Budgets", a: "alert action", al: /\bBudgets\b|presupuestos?/i },
    ce: { n: "AWS Cost Explorer", a: "trend", al: /Cost Explorer/i },
    cur: { n: "AWS Cost and Usage Report (Data Exports)", a: "detail", al: /Cost and Usage Report|\bCUR\b|Data Exports/i },
    cad: { n: "AWS Cost Anomaly Detection", a: "anomaly", al: /Anomaly Detection/i },
    co: { n: "AWS Compute Optimizer", a: "rightsize", al: /Compute Optimizer/i },
    tags: { n: "Etiquetas de asignación de costos (cost allocation tags)", a: "alloc", al: /etiquetas de asignaci[oó]n|cost allocation tags/i },
    calc: { n: "AWS Pricing Calculator", a: "estimate", al: /Pricing Calculator|calculadora de precios/i },
    ta: { n: "AWS Trusted Advisor", a: "checks", al: /Trusted Advisor/i }
  },
  cons: {
    alert: { t: "Hay que avisar por correo cuando el gasto previsto del mes supere los 5 000 USD.", lbl: "Alerta por umbral", ok: has("alert"), det: /supere|umbral|avisar/i, why: "no envía alertas por umbral de gasto previsto" },
    action: { t: "Si se supera el presupuesto, se deben aplicar acciones automáticas como restringir permisos o detener instancias.", lbl: "Acciones automáticas", ok: has("action"), det: /acciones autom[aá]ticas|detener instancias/i, why: "no ejecuta acciones al superar un presupuesto" },
    trend: { t: "Se quieren analizar las tendencias de gasto de los últimos 12 meses por servicio y pronosticar el próximo trimestre.", lbl: "Tendencias y pronóstico", ok: has("trend"), det: /tendencias|pronostic/i, why: "no grafica tendencias ni pronostica el gasto" },
    detail: { t: "Se necesitan los datos de facturación más detallados, por hora y por recurso, para consultarlos con Athena.", lbl: "Detalle por recurso", ok: has("detail"), det: /m[aá]s detallados|por hora y por recurso/i, why: "no entrega el detalle de facturación por hora y recurso" },
    anomaly: { t: "Se deben detectar automáticamente picos de gasto inusuales con machine learning, sin definir umbrales.", lbl: "Anomalías con ML", ok: has("anomaly"), det: /inusuales|anomal/i, why: "no detecta anomalías de gasto con machine learning" },
    rightsize: { t: "Se quieren recomendaciones de tamaño para EC2, EBS y Lambda basadas en las métricas de uso.", lbl: "Rightsizing", ok: has("rightsize"), det: /recomendaciones de tama[nñ]o|rightsiz/i, why: "no recomienda tamaños a partir de métricas de uso" },
    alloc: { t: "Finanzas debe ver el costo por proyecto y por centro de costos.", lbl: "Costo por proyecto", ok: has("alloc"), det: /por proyecto|centro de costos/i, why: "no asigna costos a proyectos o centros de costos" },
    estimate: { t: "Se debe estimar el costo mensual de una arquitectura antes de desplegarla.", lbl: "Estimar antes de desplegar", ok: has("estimate"), det: /antes de desplegar|estimar/i, why: "trabaja con gasto real, no estima arquitecturas nuevas" },
    checks: { t: "Se buscan verificaciones automáticas de instancias inactivas, IP elásticas sin uso y límites de servicio.", lbl: "Verificaciones de la cuenta", ok: has("checks"), det: /IP el[aá]sticas sin uso|l[ií]mites de servicio/i, why: "no revisa recursos inactivos ni límites de servicio" }
  },
  rule: "Alertas y acciones por umbral → Budgets. Tendencias y pronóstico → Cost Explorer. Máximo detalle → CUR/Data Exports. Anomalías → Cost Anomaly Detection. Rightsizing → Compute Optimizer. Costo por proyecto → etiquetas. Estimar antes → Pricing Calculator. Recursos ociosos y límites → Trusted Advisor."
});


/* ═════════════════════════ SERVICIOS AGREGADOS DE LA GUÍA OFICIAL ═════════════════════════ */

fam({ id: "ia", t: "ml", name: "Servicios de IA y machine learning",
  ctx: ["{org} quiere agregar capacidades de inteligencia artificial a su plataforma.", "{org} busca automatizar un proceso manual con servicios de IA de AWS."],
  ask: ["¿Qué servicio de AWS debe usar el arquitecto de soluciones", "¿Qué servicio cumple este requisito"],
  goals: ["ops"],
  sols: {
    rek: { n: "Amazon Rekognition", a: "pre img", r: { ops: 1 }, al: /Rekognition/i },
    textract: { n: "Amazon Textract", a: "pre docs", r: { ops: 1 }, al: /Textract/i },
    comprehend: { n: "Amazon Comprehend", a: "pre nlp", r: { ops: 1 }, al: /Comprehend/i },
    translate: { n: "Amazon Translate", a: "pre trans", r: { ops: 1 }, al: /Amazon Translate|\bTranslate\b/ },
    transcribe: { n: "Amazon Transcribe", a: "pre stt", r: { ops: 1 }, al: /Transcribe/i },
    polly: { n: "Amazon Polly", a: "pre tts", r: { ops: 1 }, al: /Polly/i },
    lex: { n: "Amazon Lex", a: "pre bot", r: { ops: 1 }, al: /Amazon Lex|\bLex\b/ },
    sagemaker: { n: "Amazon SageMaker AI", a: "img docs nlp trans stt tts custom", r: { ops: 4 }, al: /SageMaker/i }
  },
  cons: {
    img: { t: "Hay que detectar rostros, objetos y contenido inapropiado en las imágenes y videos que suben los usuarios.", lbl: "Imágenes y video", grp: "need", anchor: 1, ok: has("img"), det: /im[aá]genes|fotos|contenido inapropiado|rostros/i, why: "no analiza imágenes ni video" },
    docs: { t: "Hay que extraer texto, tablas y campos de formularios escaneados y facturas en PDF.", lbl: "Documentos y formularios", grp: "need", anchor: 1, ok: has("docs"), det: /formularios|facturas|documentos escaneados|tablas de/i, why: "no extrae tablas ni campos de documentos" },
    nlp: { t: "Hay que analizar el sentimiento y extraer entidades de miles de reseñas de clientes.", lbl: "Análisis de texto", grp: "need", anchor: 1, ok: has("nlp"), det: /sentimiento|entidades|rese[nñ]as/i, why: "no analiza el significado del texto" },
    trans: { t: "Hay que traducir automáticamente el catálogo de productos a 10 idiomas.", lbl: "Traducción", grp: "need", anchor: 1, ok: has("trans"), det: /traduc/i, why: "no traduce texto entre idiomas" },
    stt: { t: "Hay que convertir a texto las grabaciones de las llamadas del call center.", lbl: "Voz a texto", grp: "need", anchor: 1, ok: has("stt"), det: /grabaciones|voz a texto|audio a texto|transcrib/i, why: "no convierte audio en texto" },
    tts: { t: "Hay que leer en voz alta los artículos del sitio con una voz natural.", lbl: "Texto a voz", grp: "need", anchor: 1, ok: has("tts"), det: /voz alta|texto a voz|voz natural/i, why: "no genera voz a partir de texto" },
    bot: { t: "Se necesita un chatbot conversacional por voz y texto para reservar citas.", lbl: "Chatbot", grp: "need", anchor: 1, ok: has("bot"), det: /chatbot|bot conversacional/i, why: "no construye bots conversacionales" },
    pre: { t: "El equipo no tiene experiencia en machine learning y no quiere entrenar modelos.", lbl: "Sin experiencia en ML", ok: has("pre"), det: /sin experiencia en (machine learning|ML)|no (quiere|desea) entrenar/i, why: "exige preparar datos, entrenar y desplegar un modelo propio" },
    custom: { t: "Los científicos de datos deben entrenar, ajustar y desplegar sus propios modelos con datos de la empresa.", lbl: "Modelo propio", ok: has("custom"), det: /cient[ií]ficos de datos|entrenar.{0,30}(propio|modelo)/i, why: "usa modelos preentrenados y no permite entrenar un modelo propio de cualquier tipo" }
  },
  rule: "Imágenes/video → Rekognition. Documentos → Textract. Texto → Comprehend. Traducción → Translate. Voz a texto → Transcribe. Texto a voz → Polly. Chatbot → Lex. Modelo propio → SageMaker AI (descártalo si dicen 'sin experiencia en ML')."
});

fam({ id: "hibridoedge", t: "hybrid", name: "Cómputo híbrido y en el borde",
  ctx: ["{org} necesita ejecutar cargas de trabajo fuera de las regiones de AWS.", "{org} combina su centro de datos con AWS y busca la opción correcta para cada sitio."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  goals: ["ops"],
  sols: {
    outposts: { n: "AWS Outposts", a: "onsite apis awshw ecs k8s", r: { ops: 2 }, al: /Outposts?/i },
    wavelength: { n: "AWS Wavelength", a: "g5", r: { ops: 1 }, al: /Wavelength/i },
    vmc: { n: "VMware Cloud on AWS", a: "vmware", r: { ops: 2 }, al: /VMware Cloud/i },
    ecsany: { n: "Amazon ECS Anywhere", a: "onsite ownhw ecs", r: { ops: 2 }, al: /ECS Anywhere/i },
    eksany: { n: "Amazon EKS Anywhere", a: "onsite ownhw k8s", r: { ops: 3 }, al: /EKS Anywhere/i },
    snow: { n: "AWS Snowball Edge con cómputo", a: "onsite offline awshw", r: { ops: 2 }, al: /Snowball|Snow Family/i },
    region: { n: "Instancias EC2 en la región de AWS más cercana", a: "", r: { ops: 1 }, al: /regi[oó]n (de AWS )?m[aá]s cercana/i }
  },
  cons: {
    onsite: { t: "Los datos y el procesamiento deben quedarse físicamente en las instalaciones de la empresa.", lbl: "En las instalaciones", ok: has("onsite"), det: /quedarse (f[ií]sicamente )?en|en las instalaciones|residencia de datos|on-premises/i, why: "se ejecuta en infraestructura de AWS fuera de las instalaciones de la empresa" },
    apis: { t: "Se quieren usar EC2, EBS y RDS con las mismas API y consola de AWS.", lbl: "Mismas API de AWS", ok: has("apis"), det: /mismas API/i, why: "no ofrece localmente EC2, EBS y RDS con las mismas API de AWS" },
    g5: { t: "Una app móvil de realidad aumentada necesita latencia de milisegundos de un dígito para usuarios en redes 5G.", lbl: "Latencia ultrabaja en 5G", ok: has("g5"), det: /\b5G\b/i, why: "no está dentro de las redes 5G de los operadores" },
    vmware: { t: "Se deben migrar cientos de VMs de vSphere sin convertirlas y seguir usando las herramientas de VMware.", lbl: "Seguir con VMware", ok: has("vmware"), det: /vSphere|VMware/i, why: "obliga a convertir las VM o a abandonar las herramientas de VMware" },
    ecs: { t: "Los contenedores deben administrarse desde la misma consola de Amazon ECS que ya usa el equipo.", lbl: "Plano de control de ECS", ok: has("ecs"), det: /consola de (Amazon )?ECS/i, why: "no se administra con el plano de control de ECS" },
    k8s: { t: "El equipo estandarizó todo en Kubernetes y quiere la misma distribución que usa Amazon EKS.", lbl: "Kubernetes de EKS", ok: has("k8s"), det: /Kubernetes|EKS Distro/i, why: "no ejecuta clústeres de Kubernetes con la distribución de EKS" },
    ownhw: { t: "Se deben reutilizar los servidores que la empresa ya compró.", lbl: "Servidores propios", ok: has("ownhw"), det: /servidores (que (la empresa )?ya (compr|ten)|propios)/i, why: a => a.awshw ? "usa hardware que entrega AWS, no los servidores propios" : "no se ejecuta sobre los servidores de la empresa" },
    offline: { t: "El sitio es un barco sin conexión estable a internet y necesita cómputo portátil y resistente.", lbl: "Sin conectividad", ok: has("offline"), det: /sin conexi[oó]n|desconectad|barco|plataforma petrolera/i, why: a => a.onsite ? "necesita conexión permanente con la región o con su plano de control" : "depende de la conectividad con AWS" },
    awshw: { t: "AWS debe entregar, instalar y mantener el hardware.", lbl: "Hardware de AWS", ok: has("awshw"), det: /AWS (debe )?(entregar|instalar|mantener)/i, why: "requiere que la empresa ponga y mantenga su propio hardware" }
  },
  rule: "Mismas API de AWS en tu centro de datos → Outposts. 5G → Wavelength. VMware sin cambios → VMware Cloud on AWS. Contenedores en servidores propios → ECS/EKS Anywhere. Sin conectividad → Snowball Edge."
});

fam({ id: "observabilidad", t: "observ", name: "Observabilidad y salud",
  ctx: ["{org} ejecuta una aplicación de microservicios en AWS y quiere entender mejor lo que pasa en producción.", "{org} tuvo una caída y descubrió que le falta visibilidad de su plataforma."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué servicio cumple este requisito"],
  sols: {
    xray: { n: "AWS X-Ray", a: "trace", al: /X-Ray/i },
    amp: { n: "Amazon Managed Service for Prometheus", a: "prom", al: /Prometheus/i },
    amg: { n: "Amazon Managed Grafana", a: "dash", al: /Grafana/i },
    health: { n: "AWS Health Dashboard", a: "awsevents", al: /AWS Health|Health Dashboard|Personal Health/i },
    cw: { n: "Amazon CloudWatch", a: "alarm", al: /CloudWatch/i },
    trail: { n: "AWS CloudTrail", a: "", al: /CloudTrail/i }
  },
  cons: {
    trace: { t: "Se debe encontrar qué microservicio agrega latencia en solicitudes que pasan por API Gateway, Lambda y DynamoDB.", lbl: "Trazas distribuidas", ok: has("trace"), det: /qu[eé] microservicio|trazas?|recorrido de (una|cada) solicitud/i, why: "no sigue una solicitud de punta a punta entre servicios" },
    prom: { t: "Los equipos ya usan Prometheus y PromQL para las métricas de sus clústeres EKS y no quieren operar servidores de Prometheus.", lbl: "Métricas Prometheus", ok: has("prom"), det: /PromQL|Prometheus/i, why: "no es compatible con Prometheus ni PromQL" },
    dash: { t: "Se necesitan dashboards unificados con datos de CloudWatch, Prometheus y otras fuentes, con inicio de sesión único y sin administrar servidores.", lbl: "Dashboards multifuente", ok: has("dash"), det: /dashboards? (unificad|con datos de varias)|varias fuentes/i, why: "no combina varias fuentes de datos en dashboards administrados" },
    awsevents: { t: "El equipo debe recibir avisos de mantenimientos programados de AWS que afectarán a sus instancias y de incidentes en los servicios.", lbl: "Eventos de AWS", ok: has("awsevents"), det: /mantenimientos? programados?|incidentes en los servicios/i, why: "no informa eventos de AWS que afectan a tus recursos" },
    alarm: { t: "Se debe enviar una alarma cuando la latencia del balanceador supere 1 segundo.", lbl: "Alarma sobre métricas", ok: has("alarm"), det: /alarma/i, why: "no crea alarmas sobre métricas" }
  },
  rule: "Latencia entre microservicios → X-Ray. Prometheus/PromQL → Managed Prometheus. Dashboards multifuente → Managed Grafana. Mantenimientos e incidentes de AWS → AWS Health. Métricas y alarmas → CloudWatch. Quién hizo qué → CloudTrail."
});

fam({ id: "gobop", t: "govops", name: "Gobierno operativo",
  ctx: ["{org} tiene muchas cuentas y equipos en AWS y quiere ordenar cómo operan.", "{org} quiere reducir el trabajo manual de su equipo de operaciones en AWS."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué solución cumple estos requisitos"],
  sols: {
    catalog: { n: "AWS Service Catalog", a: "selfservice", al: /Service Catalog/i },
    license: { n: "AWS License Manager", a: "licenses", al: /License Manager/i },
    ram: { n: "AWS Resource Access Manager (AWS RAM)", a: "share", al: /Resource Access Manager|\bAWS RAM\b/i },
    mad: { n: "AWS Managed Microsoft AD (Directory Service)", a: "adaws", al: /Managed Microsoft AD/i },
    adc: { n: "AD Connector (Directory Service)", a: "adproxy", al: /AD Connector/i },
    ssm: { n: "AWS Systems Manager", a: "patch", al: /Systems Manager|Session Manager|Patch Manager/i },
    peering: { n: "VPC peering entre las cuentas", a: "", al: /peering/i }
  },
  cons: {
    selfservice: { t: "Los desarrolladores solo deben lanzar recursos desde un catálogo de plantillas aprobadas, sin recibir permisos amplios.", lbl: "Catálogo aprobado", ok: has("selfservice"), det: /cat[aá]logo|productos aprobados|plantillas aprobadas/i, why: "no ofrece un catálogo de productos aprobados en autoservicio" },
    licenses: { t: "Se debe controlar y limitar el uso de licencias de SQL Server y Oracle BYOL para no excederlas.", lbl: "Control de licencias", ok: has("licenses"), det: /licencias/i, why: "no rastrea ni limita licencias" },
    share: { t: "Las subredes de una VPC central y un Transit Gateway deben compartirse con otras cuentas de la organización.", lbl: "Compartir recursos entre cuentas", ok: has("share"), det: /compartir.{0,40}(subredes|recursos|Transit Gateway)/i, why: a => Object.keys(a).length ? "no comparte recursos entre cuentas" : "conecta dos VPC, pero no comparte subredes ni el Transit Gateway con otras cuentas" },
    adaws: { t: "Aplicaciones Windows en EC2 necesitan un Active Directory administrado por AWS.", lbl: "AD administrado en AWS", ok: has("adaws"), det: /Active Directory administrado/i, why: a => a.adproxy ? "solo reenvía la autenticación al AD local; no es un AD en AWS" : "no ofrece un Active Directory" },
    adproxy: { t: "La autenticación debe redirigirse al Active Directory local existente sin replicar el directorio en la nube.", lbl: "Usar el AD local", ok: has("adproxy"), det: /sin replicar el directorio|AD local/i, why: a => a.adaws ? "crea un directorio nuevo en AWS en lugar de reenviar al AD local" : "no se conecta con un Active Directory" },
    patch: { t: "Cientos de servidores EC2 y locales deben parcharse automáticamente y recibir comandos sin abrir SSH.", lbl: "Parches y comandos sin SSH", ok: has("patch"), det: /parch|sin (abrir )?SSH|puerto 22/i, why: "no parcha ni ejecuta comandos en servidores" }
  },
  rule: "Catálogo aprobado → Service Catalog. Licencias BYOL → License Manager. Compartir subredes o TGW → RAM. AD en AWS → Managed Microsoft AD; reenviar al AD local → AD Connector. Parches y acceso sin SSH → Systems Manager."
});

fam({ id: "appsweb", t: "webapps", name: "Apps web, móviles y video",
  ctx: ["{org} está lanzando una nueva aplicación para sus clientes.", "{org} quiere acelerar la entrega de sus aplicaciones y contenidos digitales."],
  ask: ["¿Qué servicio debe usar el arquitecto de soluciones", "¿Qué servicio de AWS cumple este requisito"],
  sols: {
    amplify: { n: "AWS Amplify", a: "frontend", al: /Amplify/i },
    beanstalk: { n: "AWS Elastic Beanstalk", a: "paas", al: /Beanstalk/i },
    devicefarm: { n: "AWS Device Farm", a: "devices", al: /Device Farm/i },
    sar: { n: "AWS Serverless Application Repository", a: "sarpub", al: /Serverless Application Repository/i },
    kvs: { n: "Amazon Kinesis Video Streams", a: "camera", al: /Kinesis Video/i },
    transcoder: { n: "Amazon Elastic Transcoder", a: "transcode", al: /Transcoder|MediaConvert/i },
    kds: { n: "Amazon Kinesis Data Streams", a: "", al: /Kinesis Data Streams/i }
  },
  cons: {
    frontend: { t: "Un equipo de frontend debe publicar una app React con hosting, CI/CD desde Git y autenticación, sin administrar infraestructura.", lbl: "Frontend con hosting y CI/CD", ok: has("frontend"), det: /React|frontend|CI\/CD desde Git/i, why: "no da hosting de frontend con CI/CD desde Git" },
    paas: { t: "Se debe subir el código de una aplicación Java y que AWS cree el balanceador, el Auto Scaling y el monitoreo, manteniendo acceso a las instancias.", lbl: "Subir código (PaaS)", ok: has("paas"), det: /subir el c[oó]digo|sube el c[oó]digo/i, why: "no aprovisiona la infraestructura web a partir del código" },
    devices: { t: "La app móvil debe probarse en cientos de teléfonos Android e iOS reales.", lbl: "Dispositivos reales", ok: has("devices"), det: /tel[eé]fonos|dispositivos reales/i, why: "no ofrece dispositivos reales para pruebas" },
    sarpub: { t: "Los equipos quieren publicar y reutilizar aplicaciones serverless empaquetadas entre ellos.", lbl: "Compartir apps serverless", ok: has("sarpub"), det: /aplicaciones serverless empaquetadas|reutilizar aplicaciones serverless/i, why: "no publica aplicaciones serverless para reutilizarlas" },
    camera: { t: "Se debe ingerir video en vivo de miles de cámaras de seguridad para reproducirlo y analizarlo.", lbl: "Video desde cámaras", ok: has("camera"), det: /c[aá]maras/i, why: a => a.transcode ? "convierte archivos ya guardados; no ingiere video en vivo" : "no está diseñado para ingerir video de cámaras" },
    transcode: { t: "Los videos subidos a S3 deben convertirse a formatos y resoluciones para móviles y televisores.", lbl: "Convertir formatos de video", ok: has("transcode"), det: /convertir.{0,30}(video|formatos)|resoluciones/i, why: a => a.camera ? "ingiere video en vivo, pero no convierte archivos a otros formatos" : "no convierte formatos de video" }
  },
  rule: "Frontend con hosting y CI/CD → Amplify. Subir código y que AWS arme la infraestructura → Elastic Beanstalk. Dispositivos reales → Device Farm. Apps serverless reutilizables → Serverless Application Repository. Video de cámaras → Kinesis Video Streams. Convertir formatos → Elastic Transcoder/MediaConvert."
});


/* ═════════════════════════ FUNCIONES PUNTUALES QUE EL EXAMEN PREGUNTA MUCHO ═════════════════════════ */

fam({ id: "sqsfeat", t: "decouple", name: "Ajustes de Amazon SQS",
  ctx: ["{org} usa colas de Amazon SQS entre sus microservicios y tiene un problema en producción.", "{org} procesa pedidos con trabajadores que leen de una cola de Amazon SQS."],
  ask: ["¿Qué debe cambiar el arquitecto de soluciones", "¿Qué ajuste resuelve el problema"],
  sols: {
    vis: { n: "Aumentar el visibility timeout por encima del tiempo máximo de procesamiento", a: "dupproc", al: /visibility timeout|tiempo de visibilidad/i },
    dlq: { n: "Configurar una dead-letter queue con un maxReceiveCount adecuado", a: "poison", al: /dead-letter|DLQ|maxReceiveCount/i },
    longpoll: { n: "Activar long polling (ReceiveMessageWaitTimeSeconds hasta 20 segundos)", a: "empty", al: /long polling|ReceiveMessageWaitTimeSeconds/i },
    delay: { n: "Usar una delay queue (DelaySeconds) para posponer la entrega", a: "postpone", al: /delay queue|DelaySeconds/i },
    s3ext: { n: "Guardar el contenido en S3 y enviar por la cola solo la referencia (Extended Client Library)", a: "big", al: /Extended Client|solo la referencia/i },
    fifo: { n: "Cambiar a una cola FIFO con deduplicación", a: "order", al: /FIFO/i },
    retention: { n: "Aumentar el período de retención de mensajes hasta 14 días", a: "keep", al: /retenci[oó]n/i }
  },
  cons: {
    dupproc: { t: "Los consumidores tardan hasta 2 minutos por mensaje y algunos mensajes reaparecen en la cola y se procesan dos veces antes de terminar.", lbl: "Reaparecen mientras se procesan", ok: has("dupproc"), det: /reaparecen|se procesan dos veces|vuelven a (ser visibles|aparecer)/i, why: "no evita que el mensaje vuelva a ser visible mientras todavía se procesa" },
    poison: { t: "Algunos mensajes con datos corruptos fallan siempre y bloquean a los consumidores; deben apartarse para analizarlos.", lbl: "Aislar mensajes que siempre fallan", ok: has("poison"), det: /corrupt|fallan siempre|aislarlos/i, why: "no aparta los mensajes que fallan una y otra vez" },
    empty: { t: "Los consumidores consultan la cola constantemente y la mayoría de las respuestas llegan vacías, lo que eleva el costo.", lbl: "Menos respuestas vacías", ok: has("empty"), det: /respuestas (vienen |llegan )?vac[ií]as|consulta(n)? (la cola )?constantemente/i, why: "no reduce las respuestas vacías ni la cantidad de solicitudes" },
    postpone: { t: "Cada mensaje nuevo debe esperar 5 minutos antes de que un consumidor pueda procesarlo.", lbl: "Retrasar la entrega inicial", ok: has("postpone"), det: /esperar \d+ minutos antes|posponer|retrasar la entrega/i, why: "no retrasa la entrega inicial de los mensajes nuevos" },
    big: { t: "Algunos mensajes pesan 5 MB y superan el tamaño máximo de un mensaje de SQS.", lbl: "Mensajes muy grandes", ok: has("big"), det: /\d+ ?MB|tama[nñ]o m[aá]ximo/i, why: "no permite enviar mensajes más grandes que el límite de SQS" },
    order: { t: "Los mensajes de cada cliente deben procesarse en orden y sin duplicados.", lbl: "Orden y sin duplicados", ok: has("order"), det: /en orden y sin duplicados/i, why: "no garantiza orden ni elimina duplicados" },
    keep: { t: "Los consumidores pueden quedar detenidos hasta 10 días por mantenimiento y ningún mensaje debe perderse.", lbl: "Conservar mensajes más días", ok: has("keep"), det: /detenidos hasta \d+ d[ií]as|retenci[oó]n de/i, why: "mantiene la retención predeterminada de 4 días" }
  },
  rule: "Mensajes que se procesan dos veces → visibility timeout mayor que el procesamiento. Mensajes que siempre fallan → DLQ. Respuestas vacías y costo → long polling. Retrasar la entrega → delay queue. Mensajes grandes → S3 + referencia. Orden → FIFO. Más de 4 días → aumentar la retención (máx. 14)."
});

fam({ id: "lambdafeat", t: "serverless", name: "Ajustes de AWS Lambda",
  ctx: ["{org} ejecuta su backend en funciones AWS Lambda y detectó un problema.", "{org} quiere optimizar sus funciones AWS Lambda de producción."],
  ask: ["¿Qué debe configurar el arquitecto de soluciones", "¿Qué ajuste resuelve el problema"],
  sols: {
    mem: { n: "Aumentar la memoria asignada a la función", a: "cpu", al: /memoria asignada|aumentar la memoria/i },
    prov: { n: "Configurar provisioned concurrency", a: "cold", al: /provisioned concurrency|concurrencia aprovisionada/i },
    reserved: { n: "Configurar reserved concurrency en la función", a: "cap", al: /reserved concurrency|concurrencia reservada/i },
    dest: { n: "Configurar un destino on-failure (o una DLQ) para las invocaciones asíncronas", a: "asyncfail", al: /on-failure|destino.{0,20}fall/i },
    vpcnat: { n: "Conectar la función a subredes privadas con ruta a un NAT gateway", a: "vpcinet", al: /NAT gateway/i },
    timeout: { n: "Aumentar el timeout de la función (máximo 15 minutos)", a: "longer", al: /timeout de la funci[oó]n|aumentar el timeout/i }
  },
  cons: {
    cpu: { t: "Una función hace cálculos intensivos de CPU y es lenta.", lbl: "Más CPU", ok: has("cpu"), det: /intensivos? (en|de) CPU|m[aá]s CPU/i, why: "no le da más CPU: en Lambda la CPU crece en proporción a la memoria" },
    cold: { t: "Una API sensible a la latencia sufre arranques en frío durante los picos de la mañana.", lbl: "Sin arranques en frío", ok: has("cold"), det: /arranques? en fr[ií]o|cold start/i, why: "no mantiene entornos ya inicializados" },
    cap: { t: "Una función no debe consumir toda la concurrencia de la cuenta y debe tener capacidad garantizada para ella.", lbl: "Limitar y garantizar concurrencia", ok: has("cap"), det: /toda la concurrencia|limitar la concurrencia/i, why: "no reserva ni limita la concurrencia de la función" },
    asyncfail: { t: "Los eventos asíncronos que fallan después de todos los reintentos no deben perderse.", lbl: "No perder eventos fallidos", ok: has("asyncfail"), det: /despu[eé]s de (todos )?los reintentos/i, why: "no guarda los eventos que agotaron los reintentos" },
    vpcinet: { t: "La función debe leer una base de datos RDS privada y también llamar a una API pública de internet.", lbl: "VPC + salida a internet", ok: has("vpcinet"), det: /API p[uú]blica de internet/i, why: "no da salida a internet a una función conectada a la VPC" },
    longer: { t: "Algunas ejecuciones fallan por timeout porque procesan archivos que tardan hasta 10 minutos.", lbl: "Ejecuciones más largas", ok: has("longer"), det: /fallan por timeout/i, why: "no extiende el tiempo máximo de ejecución" }
  },
  rule: "Más CPU → más memoria. Arranques en frío → provisioned concurrency. Limitar o garantizar capacidad → reserved concurrency. Eventos asíncronos fallidos → destino on-failure o DLQ. Lambda en VPC con internet → subred privada + NAT gateway. Más tiempo → timeout (máx. 15 min; si no alcanza, Fargate o Step Functions)."
});

fam({ id: "s3perf", t: "storage", name: "Rendimiento y operaciones en S3",
  ctx: ["{org} guarda grandes volúmenes de archivos en Amazon S3.", "{org} usa Amazon S3 como repositorio central de su plataforma de datos."],
  ask: ["¿Qué debe hacer el arquitecto de soluciones", "¿Qué solución cumple este requisito"],
  sols: {
    multipart: { n: "Usar multipart upload", a: "bigup", al: /multipart/i },
    ta: { n: "Habilitar S3 Transfer Acceleration", a: "faraway", al: /Transfer Acceleration/i },
    prefixes: { n: "Distribuir los objetos en varios prefijos", a: "rps", al: /varios prefijos|prefijos/i },
    range: { n: "Usar byte-range fetches para descargar partes en paralelo", a: "partial", al: /byte-range|rango de bytes/i },
    batchops: { n: "Usar S3 Batch Operations", a: "bulk", al: /Batch Operations/i },
    batchrepl: { n: "Usar S3 Batch Replication para los objetos existentes", a: "existing", al: /Batch Replication/i },
    crr: { n: "Configurar S3 Cross-Region Replication", a: "newobjs", al: /Cross-Region Replication|replicaci[oó]n entre regiones|\bCRR\b/i }
  },
  cons: {
    bigup: { t: "Se suben archivos de 5 GB que fallan a mitad de camino y deben poder reanudarse por partes.", lbl: "Subidas grandes reanudables", ok: has("bigup"), det: /reanudar|por partes|varios GB/i, why: "no divide la subida en partes que se reintentan por separado" },
    faraway: { t: "Los usuarios que suben archivos están en otro continente, lejos de la región del bucket.", lbl: "Usuarios lejanos", ok: has("faraway"), det: /otro continente|lejos de la regi[oó]n|Asia/i, why: "no acelera el trayecto desde ubicaciones lejanas" },
    rps: { t: "Una aplicación hace miles de solicitudes por segundo bajo un único prefijo y recibe errores 503 Slow Down.", lbl: "Más solicitudes por segundo", ok: has("rps"), det: /503|Slow Down|[uú]nico prefijo/i, why: "no aumenta las solicitudes por segundo que acepta el bucket" },
    partial: { t: "Solo se necesitan fragmentos de archivos muy grandes y deben descargarse en paralelo.", lbl: "Leer fragmentos en paralelo", ok: has("partial"), det: /fragmentos/i, why: "no descarga solo partes de un objeto" },
    bulk: { t: "Hay que cambiar las etiquetas de 2 000 millones de objetos existentes con una sola tarea administrada.", lbl: "Operación masiva", ok: has("bulk"), det: /millones de objetos existentes|una sola tarea/i, why: "no ejecuta operaciones masivas sobre objetos existentes" },
    existing: { t: "Los objetos que ya existen en el bucket también deben copiarse a la otra región.", lbl: "Copiar objetos existentes", ok: has("existing"), det: /ya existen|objetos existentes|millones de objetos/i, why: a => a.newobjs ? "solo replica los objetos nuevos que llegan después de configurarla" : "no copia objetos a otra región" },
    newobjs: { t: "Cada objeto nuevo debe copiarse automáticamente a un bucket de otra región.", lbl: "Copiar objetos nuevos", ok: has("newobjs"), det: /siguen llegando|cada objeto nuevo/i, why: a => a.existing ? "copia lo existente una vez, pero no replica de forma continua lo nuevo" : "no replica objetos a otra región" }
  },
  rule: "Archivos grandes → multipart upload. Usuarios lejanos → Transfer Acceleration. 503 Slow Down → más prefijos. Leer partes → byte-range fetches. Cambios masivos → Batch Operations. Replicar lo nuevo → CRR; lo que ya existe → Batch Replication."
});

fam({ id: "dynamofeat", t: "dbperf", name: "Funciones de Amazon DynamoDB",
  ctx: ["{org} usa Amazon DynamoDB como base de datos principal de su aplicación.", "{org} tiene una tabla de Amazon DynamoDB con millones de registros."],
  ask: ["¿Qué característica de DynamoDB debe usar el arquitecto de soluciones", "¿Qué solución cumple este requisito"],
  sols: {
    ttl: { n: "Habilitar TTL en un atributo con la fecha de expiración", a: "expire", al: /\bTTL\b|Time to Live/i },
    pitr: { n: "Habilitar point-in-time recovery (PITR)", a: "restore", al: /point-in-time|\bPITR\b/i },
    streams: { n: "Habilitar DynamoDB Streams con una función Lambda", a: "react", al: /Streams/i },
    dax: { n: "Agregar DynamoDB Accelerator (DAX)", a: "micro", al: /\bDAX\b|Accelerator/i },
    gsi: { n: "Crear un índice secundario global (GSI)", a: "altquery", al: /\bGSI\b|[ií]ndice secundario/i },
    pk: { n: "Rediseñar la partition key con un valor de alta cardinalidad", a: "hot", al: /partition key|clave de partici[oó]n/i },
    global: { n: "Convertir la tabla en una tabla global", a: "multiregion", al: /tablas? globales?|global tables?/i }
  },
  cons: {
    expire: { t: "Los registros de sesión dejan de servir después de 24 horas y deben borrarse solos sin consumir capacidad de escritura.", lbl: "Borrado automático", ok: has("expire"), det: /dejan de (ser |servir)|borrarse sol|eliminarlas autom/i, why: "no borra elementos vencidos automáticamente" },
    restore: { t: "Hay que poder devolver la tabla al estado que tenía hace 3 horas tras un borrado accidental.", lbl: "Restaurar a un momento", ok: has("restore"), det: /hace \d+ horas|borr[oó] por error|estado previo/i, why: "no permite restaurar la tabla a un segundo concreto" },
    react: { t: "Cada cambio en la tabla debe disparar un proceso casi en tiempo real, como enviar un correo.", lbl: "Reaccionar a cambios", ok: has("react"), det: /cada cambio|cambios en la tabla/i, why: "no emite un flujo de cambios de la tabla" },
    micro: { t: "Las lecturas repetidas deben responder en microsegundos.", lbl: "Lecturas en microsegundos", ok: has("micro"), det: /microsegundos/i, why: "no es una caché en memoria para DynamoDB" },
    altquery: { t: "Hay que consultar de forma eficiente por un atributo que no es la clave de la tabla.", lbl: "Consultar por otro atributo", ok: has("altquery"), det: /atributo que no es|otro atributo/i, why: "no permite consultar eficientemente por otro atributo" },
    hot: { t: "La tabla sufre throttling aunque no alcanza su capacidad total, porque la partition key es la fecha del día.", lbl: "Partición caliente", ok: has("hot"), det: /throttling|partition key es la fecha|baja cardinalidad/i, why: "no reparte la carga entre particiones" },
    multiregion: { t: "Usuarios de varios continentes deben escribir con baja latencia en su región.", lbl: "Escrituras en varias regiones", ok: has("multiregion"), det: /varios continentes/i, why: "no replica la tabla con escrituras en varias regiones" }
  },
  rule: "Borrar vencidos → TTL. Volver a un momento → PITR. Reaccionar a cambios → Streams + Lambda. Microsegundos → DAX. Consultar por otro atributo → GSI. Throttling con capacidad libre → partition key de alta cardinalidad. Varias regiones → global tables."
});

fam({ id: "asgfeat", t: "ha", name: "Ajustes de Auto Scaling y balanceo",
  ctx: ["{org} ejecuta una aplicación web en un grupo de Auto Scaling detrás de un Application Load Balancer.", "{org} tiene problemas de disponibilidad en su flota web con Auto Scaling."],
  ask: ["¿Qué debe cambiar el arquitecto de soluciones", "¿Qué solución resuelve el problema"],
  sols: {
    elbhc: { n: "Cambiar el tipo de health check del grupo de Auto Scaling a ELB", a: "apphealth", al: /health check.{0,40}ELB|ELB health/i },
    hook: { n: "Agregar un lifecycle hook de terminación", a: "beforeterm", al: /lifecycle hook/i },
    warm: { n: "Configurar un warm pool de instancias preinicializadas", a: "slowboot", al: /warm pool/i },
    multiaz: { n: "Repartir el grupo de Auto Scaling en al menos dos AZ detrás del ALB", a: "azfail", al: /(dos|varias|m[uú]ltiples) AZ/i },
    sticky: { n: "Activar sticky sessions en el ALB", a: "affinity", al: /sticky/i },
    session: { n: "Guardar las sesiones en Amazon ElastiCache o DynamoDB", a: "stateless", al: /sesiones en (Amazon )?(ElastiCache|DynamoDB)/i },
    bigger: { n: "Usar instancias más grandes", a: "", al: /instancias m[aá]s grandes/i }
  },
  cons: {
    apphealth: { t: "Las instancias siguen en estado running aunque la aplicación devuelve errores HTTP 500, y Auto Scaling no las reemplaza.", lbl: "Detectar fallas de la aplicación", ok: has("apphealth"), det: /errores? (HTTP )?5\d\d|no se reemplazan|no las reemplaza/i, why: "no hace que Auto Scaling reemplace instancias con la aplicación caída" },
    beforeterm: { t: "Antes de que se termine una instancia hay que copiar sus logs a S3.", lbl: "Actuar antes de terminar", ok: has("beforeterm"), det: /antes de que se termine|antes de terminar/i, why: "no pausa la terminación para ejecutar acciones" },
    slowboot: { t: "Las instancias tardan 10 minutos en arrancar y la capacidad nueva llega tarde a los picos.", lbl: "Arranque lento", ok: has("slowboot"), det: /tardan \d+ minutos en arrancar/i, why: "no acorta el tiempo hasta que una instancia nueva atiende tráfico" },
    azfail: { t: "La aplicación debe seguir funcionando si falla una zona de disponibilidad completa.", lbl: "Sobrevivir a una AZ", ok: has("azfail"), det: /ca[ií]da de una zona|falla (de )?una (zona|AZ) completa/i, why: "sigue dependiendo de una sola AZ" },
    affinity: { t: "Durante su sesión, cada usuario debe seguir llegando a la misma instancia, sin cambiar la aplicación.", lbl: "Misma instancia por usuario", ok: has("affinity"), det: /misma instancia/i, why: "no fija a cada usuario en una instancia" },
    stateless: { t: "Los usuarios no deben perder su sesión cuando Auto Scaling termina una instancia.", lbl: "No perder la sesión", ok: has("stateless"), det: /pierden (su )?sesi[oó]n|perder (su |la )?sesi[oó]n/i, why: a => a.affinity ? "mantiene al usuario en una instancia, pero la sesión se pierde igual si esa instancia termina" : "no saca la sesión de la memoria de la instancia" }
  },
  rule: "Instancias 'running' con la app caída → health check ELB. Acciones antes de terminar → lifecycle hook. Arranque lento → warm pool. Falla de AZ → varias AZ. Misma instancia → sticky sessions; no perder la sesión → sesiones en ElastiCache o DynamoDB."
});

fam({ id: "cfaccess", t: "edge", name: "Acceso y lógica en CloudFront",
  ctx: ["{org} distribuye su contenido con Amazon CloudFront.", "{org} sirve videos y archivos a sus clientes con una distribución de CloudFront."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué función de CloudFront cumple este requisito"],
  sols: {
    surl: { n: "URLs firmadas de CloudFront", a: "onefile", al: /URLs? firmadas?|signed URL/i },
    scookie: { n: "Cookies firmadas de CloudFront", a: "manyfiles", al: /cookies firmadas|signed cookies/i },
    oac: { n: "Origin Access Control (OAC) hacia el bucket", a: "originlock", al: /\bOAC\b|Origin Access/i },
    geo: { n: "La restricción geográfica de CloudFront", a: "geo", al: /restricci[oó]n geogr[aá]fica|geo ?restriction/i },
    fle: { n: "Field-level encryption", a: "fieldenc", al: /field-level/i },
    cffn: { n: "CloudFront Functions", a: "light", al: /CloudFront Functions/i },
    ledge: { n: "Lambda@Edge", a: "heavy", al: /Lambda@Edge/i }
  },
  cons: {
    onefile: { t: "Un cliente que pagó debe descargar un único archivo de instalación durante 24 horas.", lbl: "Un archivo, acceso temporal", ok: has("onefile"), det: /un (único )?archivo/i, why: a => a.manyfiles ? "sirve para muchos archivos; para uno solo lo directo es una URL firmada" : "no da acceso temporal a un archivo privado" },
    manyfiles: { t: "Los suscriptores pagados deben acceder a todos los videos de la sección premium sin cambiar las URL.", lbl: "Muchos archivos, mismas URL", ok: has("manyfiles"), det: /sin cambiar (sus |las )?URL|m[uú]ltiples archivos/i, why: a => a.onefile ? "obliga a firmar y cambiar la URL de cada archivo" : "no restringe el acceso a usuarios pagados" },
    originlock: { t: "Nadie debe poder saltarse CloudFront y leer el bucket directamente.", lbl: "Solo a través de CloudFront", ok: has("originlock"), det: /directamente por la URL de S3|saltarse CloudFront|acceder.{0,30}directamente/i, why: "no bloquea el acceso directo al bucket" },
    geo: { t: "Por contratos de licencia, el contenido no debe verse desde ciertos países.", lbl: "Bloquear países", ok: has("geo"), det: /pa[ií]ses/i, why: "no bloquea el acceso por país" },
    fieldenc: { t: "Los números de tarjeta enviados en un formulario deben cifrarse en el borde para que solo un servicio específico pueda descifrarlos.", lbl: "Cifrar campos sensibles", ok: has("fieldenc"), det: /cifrarse en el borde|campos sensibles/i, why: "no cifra campos específicos de la solicitud" },
    light: { t: "Hay que reescribir URLs y agregar encabezados en cada solicitud, con millones de solicitudes por segundo y al menor costo.", lbl: "Lógica ligera en el borde", ok: has("light"), det: /reescribir URL|agregar encabezados/i, why: a => a.heavy ? "cuesta más y tiene más latencia de lo necesario para cambios simples" : "no ejecuta código en el borde" },
    heavy: { t: "En el borde hay que llamar a un servicio externo por red y procesar el cuerpo de la solicitud.", lbl: "Lógica con red y cuerpo", ok: has("heavy"), det: /cuerpo de la solicitud|llamar a un servicio externo/i, why: a => a.light ? "no tiene acceso a la red ni al cuerpo de la solicitud" : "no ejecuta código en el borde" }
  },
  rule: "Un archivo → URL firmada. Muchos archivos sin cambiar URLs → cookies firmadas. Bloquear el acceso directo a S3 → OAC. Países → restricción geográfica. Campos sensibles → field-level encryption. Cambios simples y baratos → CloudFront Functions; red o cuerpo → Lambda@Edge."
});

fam({ id: "ec2feat", t: "compute", name: "Funciones de Amazon EC2",
  ctx: ["{org} ejecuta aplicaciones en instancias Amazon EC2.", "{org} quiere sacar más provecho de sus instancias Amazon EC2."],
  ask: ["¿Qué debe usar el arquitecto de soluciones", "¿Qué función de EC2 cumple este requisito"],
  sols: {
    hib: { n: "EC2 Hibernate", a: "warmstart", al: /Hibernat/i },
    eip: { n: "Una dirección Elastic IP", a: "fixedip", al: /Elastic IP|IP el[aá]stica/i },
    userdata: { n: "Un script en el user data de la instancia", a: "bootscript", al: /user data/i },
    ena: { n: "Enhanced networking (ENA) en un tipo de instancia compatible", a: "netperf", al: /enhanced networking|\bENA\b/i },
    imds: { n: "Exigir IMDSv2 en las instancias", a: "ssrf", al: /IMDSv2/i },
    stop: { n: "Detener y volver a iniciar la instancia", a: "", al: /detener y (volver a )?(iniciar|arrancar)/i }
  },
  cons: {
    warmstart: { t: "La aplicación tarda 10 minutos en cargar datos en memoria al iniciar; se quiere apagarla de noche y reanudarla rápido con la memoria intacta.", lbl: "Reanudar con la memoria intacta", ok: has("warmstart"), det: /memoria intacta|cargar datos en memoria/i, why: "pierde el contenido de la memoria al apagarse" },
    fixedip: { t: "La instancia necesita una IP pública fija que no cambie al detenerla e iniciarla.", lbl: "IP pública fija", ok: has("fixedip"), det: /IP p[uú]blica fija|no cambie al detener/i, why: "no conserva la IP pública al detener e iniciar" },
    bootscript: { t: "Al lanzar cada instancia hay que instalar paquetes y configurar la aplicación automáticamente.", lbl: "Configurar al lanzar", ok: has("bootscript"), det: /al lanzar cada instancia|instalar paquetes/i, why: "no ejecuta comandos al lanzar la instancia" },
    netperf: { t: "Se necesitan más paquetes por segundo, mayor ancho de banda y menor latencia de red por instancia.", lbl: "Red de alto rendimiento", ok: has("netperf"), det: /paquetes por segundo/i, why: "no mejora el rendimiento de red de la instancia" },
    ssrf: { t: "Hay que proteger las credenciales del rol de la instancia frente a ataques SSRF contra el servicio de metadatos.", lbl: "Proteger metadatos", ok: has("ssrf"), det: /SSRF|servicio de metadatos/i, why: "no protege el servicio de metadatos con tokens de sesión" }
  },
  rule: "Reanudar con la memoria intacta → Hibernate. IP pública fija → Elastic IP. Configurar al lanzar → user data. Red rápida → enhanced networking (ENA). Proteger metadatos → IMDSv2."
});

/* ── normalización ── */
for (const f of FAMILIES) {
  for (const [id, s] of Object.entries(f.sols)) {
    s.id = id;
    if (typeof s.a === "string") s.a = Object.fromEntries(s.a.split(/\s+/).filter(Boolean).map(k => [k, 1]));
    s.a = s.a || {}; s.r = s.r || {}; s.nt = s.nt || {};
  }
  f.extra = f.extra || {};
  for (const [id, c] of Object.entries({ ...f.cons, ...f.extra })) c.id = id;
  f.implicit = f.implicit || [];
  f.goals = f.goals || [];
}

const api = { FAMILIES, GOALS, ORGS, NOISE, fmtMin };
root.SAAKB = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
