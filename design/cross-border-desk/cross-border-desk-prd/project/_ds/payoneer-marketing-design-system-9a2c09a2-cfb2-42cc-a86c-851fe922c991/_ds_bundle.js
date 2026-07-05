/* @ds-bundle: {"format":3,"namespace":"PayoneerMarketingDesignSystem_9a2c09","components":[],"sourceHashes":{"ui_kits/marketing-site/components.jsx":"858f0d03f310"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PayoneerMarketingDesignSystem_9a2c09 = window.PayoneerMarketingDesignSystem_9a2c09 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/marketing-site/components.jsx
try { (() => {
/* global React */
const {
  useState
} = React;

// ─────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────

const ArrowRight = ({
  color = "currentColor"
}) => React.createElement("svg", {
  width: 10,
  height: 8,
  viewBox: "0 0 10 8",
  fill: "none",
  "aria-hidden": "true"
}, React.createElement("path", {
  d: "M0 4h9M6 1l3 3-3 3",
  stroke: color,
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const Icon = ({
  name,
  size = 32,
  color = "#1E1E28"
}) => React.createElement("span", {
  style: {
    display: "inline-block",
    width: size,
    height: size,
    color,
    WebkitMask: `url(../../assets/icons/${name}.svg) center/contain no-repeat`,
    mask: `url(../../assets/icons/${name}.svg) center/contain no-repeat`,
    backgroundColor: "currentColor"
  }
});
const Halo = ({
  name,
  bg = "#C1B1FF",
  size = 56,
  iconSize = 32,
  color = "#1E1E28",
  shadow
}) => React.createElement("div", {
  style: {
    width: size,
    height: size,
    borderRadius: "50%",
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: shadow || "0px 1.2px 1.4px rgba(44,67,75,0.05), 0px 4px 3.4px rgba(44,67,75,0.06), 0px 10px 10.5px rgba(44,67,75,0.05)"
  }
}, React.createElement(Icon, {
  name,
  size: iconSize,
  color
}));
const Button = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  onClick,
  style
}) => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: 0,
    cursor: "pointer",
    fontFamily: "var(--font-family-base)",
    fontWeight: 500,
    borderRadius: 6,
    transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    whiteSpace: "nowrap"
  };
  const sizes = {
    sm: {
      padding: "7px 22px",
      fontSize: 15,
      lineHeight: "18px"
    },
    md: {
      padding: "12px 32px",
      fontSize: 17,
      lineHeight: "24px"
    },
    lg: {
      padding: "16px 40px",
      fontSize: 18,
      lineHeight: "28px"
    }
  };
  const variants = {
    primary: {
      background: "#0033FF",
      color: "#fff"
    },
    secondary: {
      background: "#1E1E28",
      color: "#fff"
    },
    onDark: {
      background: "#FFCCF2",
      color: "#1E1E28"
    },
    link: {
      background: "transparent",
      color: "#0033FF",
      padding: 0
    },
    linkDark: {
      background: "transparent",
      color: "#C1B1FF",
      padding: 0
    }
  };
  const isLink = variant === "link" || variant === "linkDark";
  return React.createElement("button", {
    className: `btn btn-${variant}`,
    onClick,
    style: {
      ...base,
      ...(isLink ? {} : sizes[size]),
      ...variants[variant],
      ...style
    }
  }, children, icon && React.createElement(ArrowRight, {
    color: variants[variant].color
  }));
};
const Eyebrow = ({
  children,
  color = "#0033FF"
}) => React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color
  }
}, children);

// ─────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [{
  label: "Solutions",
  caret: true
}, {
  label: "Pricing"
}, {
  label: "Resources",
  caret: true
}];
function Header() {
  const [active, setActive] = useState(null);
  return React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "saturate(180%) blur(12px)",
      WebkitBackdropFilter: "saturate(180%) blur(12px)",
      borderBottom: "1px solid #E9E9E9"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "14px 32px",
      display: "flex",
      alignItems: "center",
      gap: 32
    }
  }, React.createElement("a", {
    href: "#",
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, React.createElement("img", {
    src: "../../assets/logos/Payoneer_Master_Logo_OnWhite_RGB.png",
    alt: "Payoneer",
    style: {
      height: 28
    }
  })), React.createElement("nav", {
    style: {
      display: "flex",
      gap: 26,
      alignItems: "center",
      flex: 1
    }
  }, NAV_ITEMS.map(item => React.createElement("a", {
    key: item.label,
    href: "#",
    onClick: e => {
      e.preventDefault();
      setActive(active === item.label ? null : item.label);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 15,
      fontWeight: 500,
      color: active === item.label ? "#0033FF" : "#1E1E28",
      textDecoration: "none"
    }
  }, item.label, item.caret && React.createElement("svg", {
    width: 10,
    height: 10,
    viewBox: "0 0 10 10",
    style: {
      transition: "transform .2s",
      transform: active === item.label ? "rotate(180deg)" : "rotate(0)"
    }
  }, React.createElement("path", {
    d: "M2 4l3 3 3-3",
    stroke: "currentColor",
    strokeWidth: 1.4,
    fill: "none",
    strokeLinecap: "round"
  }))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, React.createElement("a", {
    href: "#",
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: "#1E1E28",
      textDecoration: "none"
    }
  }, "Sign in"), React.createElement(Button, {
    variant: "primary",
    size: "sm",
    icon: true
  }, "Sign up"))));
}

// ─────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────
function Hero() {
  return React.createElement("section", {
    style: {
      background: "#fff",
      padding: "72px 32px 56px",
      overflow: "hidden",
      position: "relative"
    }
  },
  // dot grid
  React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.18,
      pointerEvents: "none",
      background: "radial-gradient(circle, #1E1E28 1px, transparent 1.5px) center/40px 40px",
      maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
      WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)"
    }
  }), React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      textAlign: "center",
      position: "relative"
    }
  }, React.createElement(Eyebrow, null, "One platform · 190+ countries"), React.createElement("h1", {
    style: {
      fontSize: 72,
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: "-0.02em",
      margin: "16px 0 22px",
      textWrap: "balance"
    }
  }, "Transact ", React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "#0033FF"
    }
  }, "without"), " borders."), React.createElement("p", {
    style: {
      fontSize: 20,
      lineHeight: 1.45,
      color: "#4B4B53",
      maxWidth: 680,
      margin: "0 auto 32px"
    }
  }, "The all-in-one financial platform that removes the friction from doing business across borders. Get paid, hold currencies, and pay out — like a local, anywhere."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: true
  }, "Sign up free"), React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "See how it works"))),
  // floating UI snapshots
  React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 1120,
      margin: "56px auto 0",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 18,
      alignItems: "end"
    }
  }, React.createElement(SnapshotCard, {
    tilt: -2,
    title: "Receive USD",
    figure: "$ 24,580.00",
    sub: "from Acme Inc · United States",
    icon: "money-in",
    halo: "#FFCCF2"
  }), React.createElement(SnapshotCard, {
    tilt: 0,
    lifted: true,
    title: "Hold balances",
    figure: "10+ currencies",
    sub: "USD · EUR · GBP · JPY · AUD",
    icon: "currencies",
    halo: "#C1B1FF"
  }), React.createElement(SnapshotCard, {
    tilt: 3,
    title: "Pay out",
    figure: "Like a local",
    sub: "190+ countries · low fees",
    icon: "fast-payment",
    halo: "#99ADFF"
  })));
}
function SnapshotCard({
  title,
  figure,
  sub,
  icon,
  halo,
  tilt = 0,
  lifted = false
}) {
  return React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 18,
      padding: 22,
      transform: `translateY(${lifted ? -16 : 0}px) rotate(${tilt}deg)`,
      boxShadow: lifted ? "0 4px 6px rgba(30,30,40,.04), 0 30px 60px rgba(30,30,40,.14)" : "0 2px 4px rgba(153,167,199,.10), 0 8px 8px rgba(153,167,199,.08), 0 17px 10px rgba(153,167,199,.05)",
      border: "1px solid #F1F2F7"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14
    }
  }, React.createElement(Halo, {
    name: icon,
    bg: halo,
    size: 36,
    iconSize: 22
  }), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#78787E",
      fontWeight: 500
    }
  }, title)), React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "#1E1E28"
    }
  }, figure), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#78787E",
      marginTop: 6
    }
  }, sub));
}

// ─────────────────────────────────────────────────────────────────
// Trust strip — stats on dark
// ─────────────────────────────────────────────────────────────────
function TrustStrip() {
  const stats = [{
    figure: "$6.1B",
    label: "Quarterly platform volume",
    chip: "+25% YoY"
  }, {
    figure: "190+",
    label: "Countries & territories"
  }, {
    figure: "17+",
    label: "Supported languages"
  }, {
    figure: "2M+",
    label: "Customers worldwide"
  }];
  return React.createElement("section", {
    style: {
      background: "#1E1E28",
      color: "#fff",
      padding: "56px 32px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 32
    }
  }, stats.map((s, i) => React.createElement("div", {
    key: i,
    style: {
      borderLeft: i === 0 ? "none" : "1px solid #4B4B53",
      paddingLeft: i === 0 ? 0 : 24
    }
  }, React.createElement("div", {
    style: {
      fontSize: 44,
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: "-.02em"
    }
  }, s.figure), React.createElement("div", {
    style: {
      fontSize: 14,
      color: "rgba(255,255,255,0.7)",
      marginTop: 10
    }
  }, s.label), s.chip && React.createElement("div", {
    style: {
      display: "inline-block",
      marginTop: 12,
      padding: "5px 14px",
      border: "1.5px solid #fff",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 500
    }
  }, s.chip)))));
}

// ─────────────────────────────────────────────────────────────────
// Feature grid
// ─────────────────────────────────────────────────────────────────
const FEATURES = [{
  icon: "get-money",
  halo: "#C1B1FF",
  title: "Get paid like a local",
  body: "Open virtual receiving accounts in 10+ currencies, and accept payments from clients and marketplaces the same way you would at home.",
  cta: "Open an account"
}, {
  icon: "exchange",
  halo: "#FFCCF2",
  title: "Hold and convert",
  body: "Hold balances in multiple currencies and convert when the rate works for you. No more guessing at FX margins.",
  cta: "See FX rates"
}, {
  icon: "fast-payment",
  halo: "#99ADFF",
  title: "Pay anyone, anywhere",
  body: "Pay suppliers, contractors, and your own teams in 190+ countries with one click — or schedule recurring payouts in bulk.",
  cta: "Make a payment"
}, {
  icon: "card",
  halo: "#CCD3E3",
  title: "Spend with the card",
  body: "Use your Payoneer Mastercard online and in-store, with the same balance you collect with. Withdraw cash from any ATM.",
  cta: "Get the card"
}, {
  icon: "vat",
  halo: "#C1B1FF",
  title: "Stay tax-compliant",
  body: "Built-in tax form collection, automatic VAT handling, and the audit trail your accountant actually wants.",
  cta: "Learn about tax"
}, {
  icon: "security",
  halo: "#FFCCF2",
  title: "Trusted by 2M+",
  body: "Bank-grade security, regulated in every market we operate in, and humans on support in 17+ languages.",
  cta: "Our security"
}];
function FeatureGrid() {
  return React.createElement("section", {
    style: {
      background: "#fff",
      padding: "96px 32px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto"
    }
  }, React.createElement(Eyebrow, null, "One platform"), React.createElement("h2", {
    style: {
      fontSize: 48,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      margin: "10px 0 16px",
      maxWidth: 760,
      textWrap: "balance"
    }
  }, "Everything global business needs, in one place."), React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.55,
      color: "#4B4B53",
      maxWidth: 620,
      margin: "0 0 56px"
    }
  }, "From simplifying international payments to cutting compliance complexity — Payoneer is the all-in-one platform for businesses with global ambitions."), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 24
    }
  }, FEATURES.map(f => React.createElement(FeatureBox, {
    key: f.title,
    ...f
  })))));
}
function FeatureBox({
  icon,
  halo,
  title,
  body,
  cta
}) {
  return React.createElement("div", {
    style: {
      background: "#F1F2F7",
      borderRadius: 20,
      padding: 32,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      minHeight: 320
    }
  }, React.createElement(Halo, {
    name: icon,
    bg: halo,
    size: 50,
    iconSize: 32
  }), React.createElement("h3", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      lineHeight: 1.18,
      letterSpacing: "-.02em",
      margin: 0,
      color: "#1E1E28"
    }
  }, title), React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.55,
      color: "#1E1E28",
      margin: 0,
      flex: 1
    }
  }, body), React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: true,
    style: {
      alignSelf: "flex-start"
    }
  }, cta));
}

// ─────────────────────────────────────────────────────────────────
// Product preview — balance card UI on dark
// ─────────────────────────────────────────────────────────────────
function ProductPreview() {
  return React.createElement("section", {
    style: {
      background: "#fff",
      padding: "0 32px 96px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      background: "#1E1E28",
      borderRadius: 24,
      padding: "64px 56px",
      color: "#fff",
      display: "grid",
      gridTemplateColumns: "1fr 1.1fr",
      gap: 56,
      alignItems: "center"
    }
  }, React.createElement("div", null, React.createElement(Eyebrow, {
    color: "#C1B1FF"
  }, "Inside the platform"), React.createElement("h2", {
    style: {
      fontSize: 44,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: "-.02em",
      margin: "10px 0 18px",
      color: "#fff",
      textWrap: "balance"
    }
  }, "Your balances, currencies, and customers — all in one view."), React.createElement("p", {
    style: {
      fontSize: 17,
      lineHeight: 1.55,
      color: "rgba(255,255,255,0.75)",
      margin: "0 0 28px",
      maxWidth: 480
    }
  }, "Switch currencies, send a payment, or open a new local receiving account in a few taps. No tabs, no spreadsheets, no surprises."), React.createElement(Button, {
    variant: "onDark",
    size: "md",
    icon: true
  }, "Tour the platform")),
  // mock UI
  React.createElement("div", {
    style: {
      background: "#35353E",
      borderRadius: 18,
      padding: 24,
      boxShadow: "0 30px 60px rgba(0,0,0,.30)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 22
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.6)",
      marginBottom: 6
    }
  }, "Total balance"), React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 700,
      letterSpacing: "-.02em"
    }
  }, "$ 48,231.20")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement(MiniIconBtn, {
    name: "money-in",
    label: "Receive"
  }), React.createElement(MiniIconBtn, {
    name: "money-out",
    label: "Send"
  }), React.createElement(MiniIconBtn, {
    name: "exchange",
    label: "Convert"
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      marginBottom: 18
    }
  }, React.createElement(BalanceChip, {
    code: "USD",
    amount: "24,580.00",
    flag: "🇺🇸"
  }), React.createElement(BalanceChip, {
    code: "EUR",
    amount: "12,114.50",
    flag: "🇪🇺"
  }), React.createElement(BalanceChip, {
    code: "GBP",
    amount: "8,901.30",
    flag: "🇬🇧"
  })), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.6)",
      marginBottom: 10
    }
  }, "Recent activity"), ["Acme Corp · USD", "Studio Nord · EUR", "Klein GmbH · EUR"].map((row, i) => React.createElement("div", {
    key: row,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderTop: i === 0 ? "none" : "1px solid #4B4B53",
      fontSize: 14
    }
  }, React.createElement("span", null, row), React.createElement("span", {
    style: {
      color: "#C1B1FF",
      fontWeight: 600
    }
  }, "+" + (1000 * (i + 3)).toLocaleString() + ".00"))))));
}
function BalanceChip({
  code,
  amount,
  flag
}) {
  return React.createElement("div", {
    style: {
      background: "#4B4B53",
      borderRadius: 12,
      padding: "12px 14px"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.6)",
      marginBottom: 6,
      display: "flex",
      gap: 6
    }
  }, React.createElement("span", {
    "aria-hidden": true
  }, flag), code), React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600
    }
  }, amount));
}
function MiniIconBtn({
  name,
  label
}) {
  return React.createElement("button", {
    style: {
      background: "#4B4B53",
      color: "#fff",
      border: 0,
      borderRadius: 10,
      padding: "8px 14px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "var(--font-family-base)"
    }
  }, React.createElement(Icon, {
    name,
    size: 14,
    color: "#fff"
  }), label);
}

// ─────────────────────────────────────────────────────────────────
// Customer story
// ─────────────────────────────────────────────────────────────────
function CustomerStory() {
  return React.createElement("section", {
    style: {
      background: "#F1F2F7",
      padding: "96px 32px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "0.9fr 1.2fr",
      gap: 56,
      alignItems: "center"
    }
  },
  // photo placeholder — circle crop, brand instructs cut-out inside circle
  React.createElement("div", {
    style: {
      aspectRatio: "1",
      borderRadius: "50%",
      background: "linear-gradient(155deg, #C1B1FF 0%, #99ADFF 70%, #002373 100%)",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 30px 60px rgba(75,49,178,.20)"
    }
  },
  // simple character silhouette
  React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: "45%",
      transform: "translateX(-50%)",
      width: "32%",
      aspectRatio: "1",
      borderRadius: "50%",
      background: "radial-gradient(circle at 50% 35%, #FFE0F7 0%, #FFCCF2 60%, #E5B2D8 100%)"
    }
  }), React.createElement("div", {
    style: {
      position: "absolute",
      left: "20%",
      right: "20%",
      top: "70%",
      height: "60%",
      borderRadius: "50% 50% 0 0",
      background: "linear-gradient(180deg, #1E1E28 0%, #35353E 100%)"
    }
  })), React.createElement("div", null, React.createElement(Eyebrow, null, "Customer story"), React.createElement("blockquote", {
    style: {
      fontSize: 32,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-.02em",
      margin: "16px 0 28px",
      color: "#1E1E28",
      textWrap: "balance"
    }
  }, "“We sell into seven countries — Payoneer is the only platform that keeps every currency, contract, and client invoice in one calm place.”"), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Marta Wójcik"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#78787E"
    }
  }, "Founder, Studio Nord · Warsaw")), React.createElement("div", {
    style: {
      width: 1,
      height: 32,
      background: "#D9D9D9"
    }
  }), React.createElement(Button, {
    variant: "link",
    icon: true
  }, "Read the story")))));
}

// ─────────────────────────────────────────────────────────────────
// CTA band — pink + electric split
// ─────────────────────────────────────────────────────────────────
function CTABand() {
  return React.createElement("section", {
    style: {
      padding: "0 32px 64px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24
    }
  }, React.createElement("div", {
    style: {
      background: "#FFCCF2",
      borderRadius: 24,
      padding: 48,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 240
    }
  }, React.createElement("div", null, React.createElement("h3", {
    style: {
      fontSize: 32,
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: "-.02em",
      margin: 0,
      color: "#1E1E28"
    }
  }, "Give your business the power to grow globally."), React.createElement("p", {
    style: {
      fontSize: 16,
      color: "#1E1E28",
      marginTop: 12,
      opacity: 0.8
    }
  }, "Sign up today for the all-in-one Payoneer platform.")), React.createElement(Button, {
    variant: "secondary",
    size: "md",
    icon: true,
    style: {
      alignSelf: "flex-start"
    }
  }, "Sign up free")), React.createElement("div", {
    style: {
      background: "#0033FF",
      borderRadius: 24,
      padding: 48,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 240,
      position: "relative",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: "absolute",
      right: -40,
      top: -40,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.10)"
    }
  }), React.createElement("div", null, React.createElement("h3", {
    style: {
      fontSize: 32,
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: "-.02em",
      margin: 0
    }
  }, "Talk to sales for high-volume needs."), React.createElement("p", {
    style: {
      fontSize: 16,
      marginTop: 12,
      opacity: 0.85
    }
  }, "Dedicated managers and tailored solutions for marketplaces and enterprises.")), React.createElement(Button, {
    variant: "onDark",
    size: "md",
    icon: true,
    style: {
      alignSelf: "flex-start"
    }
  }, "Contact sales"))));
}

// ─────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────
const FOOTER_COLS = [{
  title: "For businesses",
  items: ["Get paid", "Pay suppliers", "Pay contractors", "Working Capital", "Tax services", "Mass payouts", "Capital Advance"]
}, {
  title: "Partner & Affiliate",
  items: ["Marketplaces", "Banks & financial", "ERP integrations", "Affiliate program", "Become a partner", "Developer API"]
}, {
  title: "Learn about Payoneer",
  items: ["About us", "Newsroom", "Customer stories", "Resource center", "Blog", "Careers", "Investor relations", "Contact us"]
}, {
  title: "Customer care",
  items: ["Help center", "Customer support", "Pricing", "Sign in to Payoneer", "Get verified", "Refer a friend", "Status"]
}];
function Footer() {
  return React.createElement("footer", {
    style: {
      background: "#1E1E28",
      color: "#fff",
      padding: "72px 32px 32px"
    }
  }, React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto"
    }
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.3fr repeat(4, 1fr)",
      gap: 32,
      paddingBottom: 56,
      borderBottom: "1px solid #35353E"
    }
  }, React.createElement("div", null, React.createElement("img", {
    src: "../../assets/logos/Payoneer_Master_Logo_OnDark_RGB.png",
    alt: "Payoneer",
    style: {
      height: 28,
      marginBottom: 18
    }
  }), React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: "rgba(255,255,255,0.65)",
      lineHeight: 1.55,
      maxWidth: 260
    }
  }, "Payoneer empowers businesses to grow globally — with the platform, partners, and people to do business in 190+ countries."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 22
    }
  }, ["X", "in", "f", "▶", "@"].map(s => React.createElement("a", {
    key: s,
    href: "#",
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      border: "1px solid #4B4B53",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 13,
      textDecoration: "none"
    }
  }, s)))), FOOTER_COLS.map(col => React.createElement("div", {
    key: col.title
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: "#C1B1FF",
      marginBottom: 18
    }
  }, col.title), React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, col.items.map(it => React.createElement("li", {
    key: it
  }, React.createElement("a", {
    href: "#",
    style: {
      color: "rgba(255,255,255,0.75)",
      textDecoration: "none",
      fontSize: 14
    }
  }, it))))))), React.createElement("div", {
    style: {
      padding: "24px 0 0",
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "rgba(255,255,255,0.55)",
      flexWrap: "wrap",
      gap: 18
    }
  }, React.createElement("div", null, "© 2026 Payoneer Inc. All rights reserved."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 24
    }
  }, ["Privacy", "Terms", "Compliance", "Cookies", "Accessibility"].map(t => React.createElement("a", {
    key: t,
    href: "#",
    style: {
      color: "rgba(255,255,255,0.55)",
      textDecoration: "none"
    }
  }, t))))));
}

// Expose to window
Object.assign(window, {
  Header,
  Hero,
  TrustStrip,
  FeatureGrid,
  ProductPreview,
  CustomerStory,
  CTABand,
  Footer,
  Button,
  Halo,
  Icon,
  Eyebrow,
  ArrowRight
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/components.jsx", error: String((e && e.message) || e) }); }

})();
