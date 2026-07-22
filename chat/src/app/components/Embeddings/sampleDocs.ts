export type DocLang = 'ja' | 'de' | 'es' | 'en';

export interface SampleDoc {
  id: string;
  title: string;
  lang: DocLang;
  flag: string;
  label: string;
  markdown: string;
}

export const DOC_LANG_LABEL: Record<DocLang, string> = {
  ja: 'Japanese',
  de: 'German',
  es: 'Spanish',
  en: 'English',
};

const ES_MARKDOWN = `# Centro de ayuda de pagos transfronterizos

## Solicitar un reembolso
Puedes pedir un reembolso desde el detalle del pago dentro de los 30 días posteriores al envío. El dinero vuelve al método de origen en un plazo de 5 a 10 días hábiles.

## Cuánto tarda una transferencia internacional
La mayoría de las transferencias internacionales llegan en 1 a 3 días hábiles. Los pagos a países con verificación adicional pueden tardar hasta 5 días.

## Comisiones de transferencia
Cobramos una comisión fija más un pequeño porcentaje sobre el importe convertido. Verás el desglose completo y el tipo de cambio antes de confirmar el envío.

## Verificar tu identidad
Para operar sin límites necesitas subir un documento de identidad vigente y un comprobante de domicilio. La revisión suele completarse en menos de 24 horas.

## Restablecer tu contraseña
Haz clic en "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión y sigue el enlace que enviamos a tu correo. El enlace caduca a los 60 minutos por seguridad.

## Límites de envío y recepción
Las cuentas sin verificar pueden mover hasta 1.000 € al mes. Una vez verificada tu identidad, los límites aumentan de forma automática.

## Países admitidos
Operamos en más de 60 países de Europa, América y Asia. Puedes consultar la lista completa y las divisas disponibles en los ajustes de tu cuenta.

## Contactar con soporte
Nuestro equipo está disponible por chat las 24 horas y por correo en soporte@example.com. Ten a mano el número de referencia del pago para agilizar la gestión.
`;

const DE_MARKDOWN = `# Hilfe-Center für grenzüberschreitende Zahlungen

## Rückerstattung anfordern
Eine Rückerstattung kannst du in den Zahlungsdetails innerhalb von 30 Tagen nach dem Versand beantragen. Der Betrag wird binnen 5 bis 10 Werktagen auf die ursprüngliche Zahlungsquelle zurückgebucht.

## Dauer einer Auslandsüberweisung
Die meisten Auslandsüberweisungen kommen innerhalb von 1 bis 3 Werktagen an. Zahlungen in Länder mit zusätzlicher Prüfung können bis zu 5 Tage dauern.

## Überweisungsgebühren
Wir berechnen eine feste Gebühr sowie einen kleinen Prozentsatz auf den umgerechneten Betrag. Die vollständige Aufstellung und den Wechselkurs siehst du vor der Bestätigung.

## Identität bestätigen
Um ohne Limits zu zahlen, lade ein gültiges Ausweisdokument und einen Adressnachweis hoch. Die Prüfung ist in der Regel in weniger als 24 Stunden abgeschlossen.

## Passwort zurücksetzen
Klicke auf der Anmeldeseite auf "Passwort vergessen?" und folge dem Link in der E-Mail, die wir dir senden. Aus Sicherheitsgründen läuft der Link nach 60 Minuten ab.

## Sende- und Empfangslimits
Nicht verifizierte Konten können bis zu 1.000 € pro Monat bewegen. Nach der Identitätsprüfung werden die Limits automatisch angehoben.

## Unterstützte Länder
Wir sind in über 60 Ländern in Europa, Amerika und Asien aktiv. Die vollständige Liste und die verfügbaren Währungen findest du in deinen Kontoeinstellungen.

## Support kontaktieren
Unser Team ist rund um die Uhr per Chat und unter support@example.com per E-Mail erreichbar. Halte die Referenznummer der Zahlung bereit, damit wir schneller helfen können.
`;

const JA_MARKDOWN = `# 海外送金ヘルプセンター

## 返金を申請する
返金は、送金から30日以内であれば支払い詳細画面から申請できます。返金額は5〜10営業日で元の支払い方法に戻ります。

## 海外送金にかかる日数
ほとんどの海外送金は1〜3営業日で着金します。追加確認が必要な国への送金は、最大5日ほどかかる場合があります。

## 送金手数料
手数料は固定額に加えて、換算後の金額に対するわずかな割合がかかります。確定前に手数料の内訳と為替レートをすべて確認できます。

## 本人確認を行う
上限なくご利用いただくには、有効な本人確認書類と住所確認書類のアップロードが必要です。審査は通常24時間以内に完了します。

## パスワードを再設定する
ログイン画面の「パスワードをお忘れですか？」をクリックし、メールで届いたリンクから再設定してください。リンクは安全のため60分で失効します。

## 送金・受取の上限
本人確認前のアカウントは月あたり最大1,000ユーロまで利用できます。本人確認が完了すると、上限は自動的に引き上げられます。

## 対応している国
ヨーロッパ、アメリカ、アジアの60か国以上でご利用いただけます。対応国と利用可能な通貨の一覧は、アカウント設定で確認できます。

## サポートに問い合わせる
サポートチームはチャットで24時間、メールは support@example.com で対応しています。手続きを早めるため、支払いの参照番号をお手元にご用意ください。
`;

const EN_MARKDOWN = `# Cross-Border Payments Help Center

## Requesting a refund
You can request a refund from the payment details screen within 30 days of sending. The money returns to your original payment method within 5 to 10 business days.

## How long an international transfer takes
Most international transfers arrive within 1 to 3 business days. Payments to countries that require extra checks can take up to 5 days.

## Transfer fees
We charge a fixed fee plus a small percentage of the converted amount. You will see the full breakdown and the exchange rate before you confirm.

## Verifying your identity
To pay without limits, upload a valid ID document and a proof of address. Review is usually finished in under 24 hours.

## Resetting your password
Click "Forgot your password?" on the sign-in screen and follow the link we email you. For security, the link expires after 60 minutes.

## Sending and receiving limits
Unverified accounts can move up to 1,000 EUR per month. Once your identity is verified, your limits are raised automatically.

## Supported countries
We operate in more than 60 countries across Europe, the Americas, and Asia. You can find the full list and available currencies in your account settings.

## Contacting support
Our team is available by chat 24 hours a day and by email at support@example.com. Keep your payment reference number handy so we can help you faster.
`;

export const SAMPLE_DOCS: ReadonlyArray<SampleDoc> = [
  {
    id: 'es-payments',
    title: 'Centro de ayuda de pagos transfronterizos',
    lang: 'es',
    flag: '🇪🇸',
    label: 'Español',
    markdown: ES_MARKDOWN,
  },
  {
    id: 'de-payments',
    title: 'Hilfe-Center für grenzüberschreitende Zahlungen',
    lang: 'de',
    flag: '🇩🇪',
    label: 'Deutsch',
    markdown: DE_MARKDOWN,
  },
  {
    id: 'ja-payments',
    title: '海外送金ヘルプセンター',
    lang: 'ja',
    flag: '🇯🇵',
    label: '日本語',
    markdown: JA_MARKDOWN,
  },
  {
    id: 'en-payments',
    title: 'Cross-Border Payments Help Center',
    lang: 'en',
    flag: '🇬🇧',
    label: 'English',
    markdown: EN_MARKDOWN,
  },
];
