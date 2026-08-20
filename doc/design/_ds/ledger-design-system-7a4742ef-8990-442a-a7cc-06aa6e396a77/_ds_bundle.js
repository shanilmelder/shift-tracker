/* @ds-bundle: {"format":4,"namespace":"LedgerDesignSystem_7a4742","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Money","sourcePath":"components/core/Money.jsx"},{"name":"ICONS","sourcePath":"components/core/icons.js"},{"name":"ICON_NAMES","sourcePath":"components/core/icons.js"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"KpiCard","sourcePath":"components/data/KpiCard.jsx"},{"name":"ProgressBar","sourcePath":"components/data/ProgressBar.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"FieldRow","sourcePath":"components/forms/FieldRow.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"PageHeader","sourcePath":"components/navigation/PageHeader.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"1cd7f4ef2e71","components/core/Button.jsx":"384a125f3d2b","components/core/Card.jsx":"c9134a83de61","components/core/Icon.jsx":"e70d37922bd9","components/core/IconButton.jsx":"4df15feceebf","components/core/Money.jsx":"048d4ed87dab","components/core/icons.js":"70c5af112da9","components/data/BarChart.jsx":"4b49052e7417","components/data/KpiCard.jsx":"9d21f694e1bc","components/data/ProgressBar.jsx":"ebf0f1e6c13b","components/data/Table.jsx":"debf9b6e3f34","components/feedback/EmptyState.jsx":"8501e3fe4b7c","components/feedback/Modal.jsx":"ebca8776d0b3","components/forms/FieldRow.jsx":"aa35e34c190a","components/forms/Input.jsx":"9fada6706455","components/forms/Select.jsx":"65a31c809818","components/navigation/NavItem.jsx":"eabd247bca54","components/navigation/PageHeader.jsx":"e6e82adb3289","components/navigation/Sidebar.jsx":"5c75ba1e3c33","ui_kits/ledger-app/App.jsx":"0f4320123357","ui_kits/ledger-app/BudgetsScreen.jsx":"9105b64fcdb7","ui_kits/ledger-app/DashboardScreen.jsx":"ed30c5ca0947","ui_kits/ledger-app/LoginScreen.jsx":"acea0bb9a0d0","ui_kits/ledger-app/TransactionsScreen.jsx":"ab353c3efd22","ui_kits/ledger-app/data.js":"0a6606657791"},"inlinedExternals":[],"unexposedExports":[{"name":"formatMoney","sourcePath":"components/core/Money.jsx"}]} */

(() => {

const __ds_ns = (window.LedgerDesignSystem_7a4742 = window.LedgerDesignSystem_7a4742 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  income: {
    background: 'var(--accent-soft)',
    color: 'var(--income)'
  },
  expense: {
    background: 'var(--expense-soft)',
    color: 'var(--expense)'
  },
  neutral: {
    background: 'var(--surface-muted)',
    color: 'var(--text-secondary)'
  },
  warning: {
    background: 'rgba(194,65,12,0.10)',
    color: 'var(--over-budget)'
  }
};

/** Small labelled tint: transaction kind, category, budget status. */
function Badge({
  tone = 'neutral',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      fontWeight: 'var(--weight-label)',
      whiteSpace: 'nowrap',
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface container: 1px border, radius md, raised shadow, 24px padding. */
function Card({
  title,
  action,
  padding,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-raised)',
      padding: padding ?? 'var(--card-padding)',
      ...style
    }
  }, rest), title || action ? /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--leading-lg)',
      fontWeight: 'var(--weight-heading)',
      color: 'var(--text)'
    }
  }, title), action) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Money.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function formatMoney(amount, {
  currency = 'LKR',
  signed = false
} = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const sign = signed ? n < 0 ? '−' : '+' : n < 0 ? '−' : '';
  return sign + currency + ' ' + body;
}

/** Money value: LKR prefix, thousands separators, two decimals, tabular figures. */
function Money({
  amount,
  kind = 'neutral',
  signed = false,
  currency = 'LKR',
  style,
  ...rest
}) {
  const color = kind === 'income' ? 'var(--income)' : kind === 'expense' ? 'var(--expense)' : 'var(--text)';
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "tabular",
    style: {
      fontVariantNumeric: 'tabular-nums',
      color,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), formatMoney(amount, {
    currency,
    signed
  }));
}
Object.assign(__ds_scope, { formatMoney, Money });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Money.jsx", error: String((e && e.message) || e) }); }

// components/core/icons.js
try { (() => {
// Lucide icons v0.441.0 (ISC). Inlined so glyphs need no network and inherit currentColor.
// The same SVGs live in assets/icons/ for use outside React.
const ICONS = {
  'arrow-down-left': '<svg class="lucide lucide-arrow-down-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M17 7 7 17"></path> <path d="M17 17H7V7"></path> </svg>',
  'arrow-up-right': '<svg class="lucide lucide-arrow-up-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M7 7h10v10"></path> <path d="M7 17 17 7"></path> </svg>',
  'banknote': '<svg class="lucide lucide-banknote" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <rect width="20" height="12" x="2" y="6" rx="2"></rect> <circle cx="12" cy="12" r="2"></circle> <path d="M6 12h.01M18 12h.01"></path> </svg>',
  'calendar': '<svg class="lucide lucide-calendar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M8 2v4"></path> <path d="M16 2v4"></path> <rect width="18" height="18" x="3" y="4" rx="2"></rect> <path d="M3 10h18"></path> </svg>',
  'chart-pie': '<svg class="lucide lucide-chart-pie" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"></path> <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path> </svg>',
  'check': '<svg class="lucide lucide-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M20 6 9 17l-5-5"></path> </svg>',
  'chevron-down': '<svg class="lucide lucide-chevron-down" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="m6 9 6 6 6-6"></path> </svg>',
  'circle-alert': '<svg class="lucide lucide-circle-alert" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <circle cx="12" cy="12" r="10"></circle> <line x1="12" x2="12" y1="8" y2="12"></line> <line x1="12" x2="12.01" y1="16" y2="16"></line> </svg>',
  'download': '<svg class="lucide lucide-download" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path> <polyline points="7 10 12 15 17 10"></polyline> <line x1="12" x2="12" y1="15" y2="3"></line> </svg>',
  'ellipsis': '<svg class="lucide lucide-ellipsis" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <circle cx="12" cy="12" r="1"></circle> <circle cx="19" cy="12" r="1"></circle> <circle cx="5" cy="12" r="1"></circle> </svg>',
  'filter': '<svg class="lucide lucide-filter" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon> </svg>',
  'layout-dashboard': '<svg class="lucide lucide-layout-dashboard" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <rect width="7" height="9" x="3" y="3" rx="1"></rect> <rect width="7" height="5" x="14" y="3" rx="1"></rect> <rect width="7" height="9" x="14" y="12" rx="1"></rect> <rect width="7" height="5" x="3" y="16" rx="1"></rect> </svg>',
  'list': '<svg class="lucide lucide-list" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <line x1="8" x2="21" y1="6" y2="6"></line> <line x1="8" x2="21" y1="12" y2="12"></line> <line x1="8" x2="21" y1="18" y2="18"></line> <line x1="3" x2="3.01" y1="6" y2="6"></line> <line x1="3" x2="3.01" y1="12" y2="12"></line> <line x1="3" x2="3.01" y1="18" y2="18"></line> </svg>',
  'log-out': '<svg class="lucide lucide-log-out" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path> <polyline points="16 17 21 12 16 7"></polyline> <line x1="21" x2="9" y1="12" y2="12"></line> </svg>',
  'pencil': '<svg class="lucide lucide-pencil" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path> <path d="m15 5 4 4"></path> </svg>',
  'piggy-bank': '<svg class="lucide lucide-piggy-bank" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"></path> <path d="M2 9v1c0 1.1.9 2 2 2h1"></path> <path d="M16 11h.01"></path> </svg>',
  'plus': '<svg class="lucide lucide-plus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M5 12h14"></path> <path d="M12 5v14"></path> </svg>',
  'receipt': '<svg class="lucide lucide-receipt" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path> <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path> <path d="M12 17.5v-11"></path> </svg>',
  'search': '<svg class="lucide lucide-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <circle cx="11" cy="11" r="8"></circle> <path d="m21 21-4.3-4.3"></path> </svg>',
  'settings': '<svg class="lucide lucide-settings" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path> <circle cx="12" cy="12" r="3"></circle> </svg>',
  'target': '<svg class="lucide lucide-target" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <circle cx="12" cy="12" r="10"></circle> <circle cx="12" cy="12" r="6"></circle> <circle cx="12" cy="12" r="2"></circle> </svg>',
  'trash-2': '<svg class="lucide lucide-trash-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M3 6h18"></path> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path> <line x1="10" x2="10" y1="11" y2="17"></line> <line x1="14" x2="14" y1="11" y2="17"></line> </svg>',
  'wallet': '<svg class="lucide lucide-wallet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path> <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path> </svg>',
  'x': '<svg class="lucide lucide-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M18 6 6 18"></path> <path d="m6 6 12 12"></path> </svg>'
};
const ICON_NAMES = Object.keys(ICONS);
Object.assign(__ds_scope, { ICONS, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/icons.js", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Line icon from the Lucide set: 20px, 1.5px stroke, inherits currentColor. */
function Icon({
  name,
  size = 20,
  stroke = 1.5,
  color,
  title,
  style,
  ...rest
}) {
  const svg = __ds_scope.ICONS[name];
  const markup = svg ? svg.replace('<svg', '<svg width="100%" height="100%"').replace(/stroke-width="[^"]*"/, 'stroke-width="' + stroke + '"') : '';
  return /*#__PURE__*/React.createElement("span", _extends({
    role: title ? 'img' : 'presentation',
    "aria-label": title,
    title: title,
    dangerouslySetInnerHTML: {
      __html: markup
    },
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flex: '0 0 auto',
      color: color || 'currentColor',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const variants = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid var(--accent)'
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid var(--danger)'
  }
};
const hovers = {
  primary: {
    background: 'var(--accent-hover)',
    border: '1px solid var(--accent-hover)'
  },
  secondary: {
    background: 'var(--surface-muted)'
  },
  ghost: {
    background: 'var(--surface-muted)'
  },
  danger: {
    background: '#8A2C21',
    border: '1px solid #8A2C21'
  }
};

/** Primary action control. 40px tall, radius md, weight 500. */
function Button({
  variant = 'primary',
  icon,
  iconRight,
  disabled,
  fullWidth,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      height: 'var(--control-height)',
      padding: '0 var(--space-4)',
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      fontWeight: 'var(--weight-label)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background 120ms ease, color 120ms ease',
      ...variants[variant],
      ...(hover && !disabled ? hovers[variant] : null),
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: 16
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Icon-only action, used for table row actions and modal dismissals. */
function IconButton({
  icon,
  label,
  tone = 'default',
  size = 32,
  disabled,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const color = tone === 'danger' ? 'var(--danger)' : 'var(--text-secondary)';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover && !disabled ? 'var(--surface-muted)' : 'transparent',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-sm)',
      color: hover && !disabled && tone !== 'danger' ? 'var(--text)' : color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background 120ms ease, color 120ms ease',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)'];

/** CSS bar chart. Grouped income/expense series, or a single categorical series. */
function BarChart({
  data = [],
  series = [{
    key: 'value',
    color: 'var(--chart-1)'
  }],
  height = 180,
  formatValue,
  style,
  ...rest
}) {
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0)));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 'var(--space-4)',
      height
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: d.label ?? i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 'var(--space-1)',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3,
      height: '100%'
    },
    title: formatValue ? series.map(s => formatValue(d[s.key])).join(' · ') : undefined
  }, series.map((s, j) => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    style: {
      flex: 1,
      height: (Number(d[s.key]) || 0) / max * 100 + '%',
      minHeight: 2,
      background: s.color || PALETTE[j % PALETTE.length],
      borderRadius: '2px 2px 0 0',
      transition: 'height 240ms cubic-bezier(0.2,0,0,1)'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)'
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: (d.label ?? i) + '-l',
    style: {
      flex: 1,
      textAlign: 'center',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--text-secondary)'
    }
  }, d.label))));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/KpiCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Single headline figure: sm label above an xl weight-600 value. */
function KpiCard({
  label,
  amount,
  value,
  kind = 'neutral',
  delta,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    padding: "var(--space-6)",
    style: style
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--text-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)',
      fontSize: 'var(--text-xl)',
      lineHeight: 'var(--leading-xl)',
      fontWeight: 'var(--weight-heading)'
    }
  }, value != null ? /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, value) : /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: amount,
    kind: kind
  })), delta ? /*#__PURE__*/React.createElement("div", {
    className: "tabular",
    style: {
      marginTop: 'var(--space-1)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, delta) : null);
}
Object.assign(__ds_scope, { KpiCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KpiCard.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Budget usage bar. Turns over-budget once value exceeds the limit. */
function ProgressBar({
  value = 0,
  max = 100,
  style,
  ...rest
}) {
  const pct = max > 0 ? (Number(value) || 0) / max * 100 : 0;
  const over = pct > 100;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      height: 6,
      background: 'var(--surface-muted)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.min(100, pct) + '%',
      height: '100%',
      background: over ? 'var(--over-budget)' : 'var(--under-budget)',
      borderRadius: 'var(--radius-full)',
      transition: 'width 240ms cubic-bezier(0.2,0,0,1)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Data table: muted header, 1px row borders, right-aligned amounts. */
function Table({
  columns = [],
  rows = [],
  rowKey,
  onRowClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(-1);
  return /*#__PURE__*/React.createElement("table", _extends({
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      background: 'var(--surface)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--surface-muted)'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align === 'right' ? 'right' : 'left',
      padding: 'var(--cell-padding-y) var(--cell-padding-x)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      fontWeight: 'var(--weight-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-header)',
      color: 'var(--text-secondary)',
      width: c.width,
      whiteSpace: 'nowrap'
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: rowKey ? rowKey(row, i) : i,
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(-1),
    onClick: onRowClick ? () => onRowClick(row, i) : undefined,
    style: {
      background: hover === i ? 'var(--surface-muted)' : 'transparent',
      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
      cursor: onRowClick ? 'pointer' : 'default',
      transition: 'background 100ms ease'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    className: c.align === 'right' ? 'tabular' : undefined,
    style: {
      padding: 'var(--cell-padding-y) var(--cell-padding-x)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--text)',
      textAlign: c.align === 'right' ? 'right' : 'left',
      fontVariantNumeric: c.align === 'right' ? 'tabular-nums' : undefined,
      verticalAlign: 'middle'
    }
  }, c.render ? c.render(row, i) : row[c.key]))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Centred placeholder. Every list and chart has one. */
function EmptyState({
  icon,
  message,
  action,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-12) var(--space-6)',
      textAlign: 'center',
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 24,
    color: "var(--text-muted)"
  }) : null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--text-muted)'
    }
  }, message), action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Centred dialog, max 480px, over a 40% backdrop. */
function Modal({
  open,
  title,
  onClose,
  actions,
  children,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--backdrop)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      zIndex: 50,
      animation: 'ledger-fade 160ms ease'
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: '100%',
      maxWidth: 480,
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-modal)',
      padding: 'var(--space-8)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--leading-lg)',
      fontWeight: 'var(--weight-heading)'
    }
  }, title), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    onClick: onClose
  }) : null), children, actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-8)'
    }
  }, actions) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/forms/FieldRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Form layout: stacked fields at 16px gap, or side-by-side columns. */
function FieldRow({
  columns = 1,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))',
      gap: 'var(--field-gap)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { FieldRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FieldRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input: 40px tall, 12px padding, 1px border, radius sm. */
function Input({
  label,
  hint,
  error,
  prefix,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)'
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      fontWeight: 'var(--weight-label)',
      color: 'var(--text-secondary)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      height: 'var(--control-height)',
      padding: '0 var(--space-3)',
      background: 'var(--surface)',
      border: '1px solid ' + (error ? 'var(--danger)' : focus ? 'var(--border-strong)' : 'var(--border)'),
      borderRadius: 'var(--radius-sm)',
      outline: focus && !error ? '2px solid var(--focus-ring)' : 'none',
      outlineOffset: 2,
      transition: 'border-color 120ms ease'
    }
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text)',
      ...style
    }
  }, rest))), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--danger)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to match Input. */
function Select({
  label,
  hint,
  error,
  options = [],
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)'
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      fontWeight: 'var(--weight-label)',
      color: 'var(--text-secondary)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      height: 'var(--control-height)',
      padding: '0 var(--space-3)',
      background: 'var(--surface)',
      border: '1px solid ' + (error ? 'var(--danger)' : focus ? 'var(--border-strong)' : 'var(--border)'),
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text)',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg%20class%3D%22lucide%20lucide-chevron-down%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235F635C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%20%3Cpath%20d%3D%22m6%209%206%206%206-6%22%3E%3C%2Fpath%3E%20%3C%2Fsvg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      backgroundSize: '16px 16px',
      paddingRight: 'var(--space-8)',
      ...style
    }
  }, rest), options.map(o => {
    const value = typeof o === 'string' ? o : o.value;
    const label2 = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, label2);
  })), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--danger)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Sidebar navigation row. */
function NavItem({
  icon,
  label,
  active,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      width: '100%',
      height: 36,
      padding: '0 var(--space-3)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-muted)' : 'transparent',
      color: active ? 'var(--accent)' : hover ? 'var(--text)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      fontWeight: 'var(--weight-label)',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 120ms ease, color 120ms ease',
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  }) : null, label);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PageHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Page title row: 2xl Fraunces title, optional subtitle, right-aligned actions. */
function PageHeader({
  title,
  subtitle,
  actions,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--section-gap)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--leading-2xl)',
      fontWeight: 'var(--weight-heading)',
      color: 'var(--text)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-1) 0 0',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--text-secondary)'
    }
  }, subtitle) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Fixed 240px full-height navigation rail. */
function Sidebar({
  items = [],
  current,
  onNavigate,
  footer,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      width: 'var(--sidebar-width)',
      flex: '0 0 var(--sidebar-width)',
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: 'var(--space-6) var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-3)',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--leading-lg)',
      fontWeight: 'var(--weight-heading)',
      color: 'var(--text)'
    }
  }, "Ledger"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)'
    }
  }, items.map(it => /*#__PURE__*/React.createElement(__ds_scope.NavItem, {
    key: it.id,
    icon: it.icon,
    label: it.label,
    active: current === it.id,
    onClick: () => onNavigate && onNavigate(it.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }, footer));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/App.jsx
try { (() => {
const {
  Sidebar,
  NavItem,
  Modal,
  Button,
  Input,
  Select,
  FieldRow,
  Money
} = window.LedgerDesignSystem_7a4742;
const NAV = [{
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'layout-dashboard'
}, {
  id: 'transactions',
  label: 'Transactions',
  icon: 'list'
}, {
  id: 'budgets',
  label: 'Budgets',
  icon: 'target'
}, {
  id: 'reports',
  label: 'Reports',
  icon: 'chart-pie'
}];
function App() {
  const [signedIn, setSignedIn] = React.useState(true);
  const [view, setView] = React.useState('dashboard');
  const [transactions, setTransactions] = React.useState(window.LedgerData.transactions);
  const [adding, setAdding] = React.useState(false);
  const [deleting, setDeleting] = React.useState(null);
  const [draft, setDraft] = React.useState({
    desc: '',
    amount: '',
    cat: 'Groceries',
    kind: 'expense'
  });
  if (!signedIn) return /*#__PURE__*/React.createElement(LoginScreen, {
    onSignIn: () => setSignedIn(true)
  });
  const save = () => {
    const amt = parseFloat(String(draft.amount).replace(/,/g, ''));
    if (!Number.isFinite(amt) || !draft.desc) return;
    setTransactions([{
      id: 'n' + Date.now(),
      date: '12 Aug 2026',
      desc: draft.desc,
      cat: draft.cat,
      account: 'Sampath debit',
      amount: draft.kind === 'income' ? Math.abs(amt) : -Math.abs(amt),
      kind: draft.kind
    }, ...transactions]);
    setDraft({
      desc: '',
      amount: '',
      cat: 'Groceries',
      kind: 'expense'
    });
    setAdding(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    items: NAV,
    current: view,
    onNavigate: setView,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(NavItem, {
      icon: "settings",
      label: "Settings",
      onClick: () => setView('settings'),
      active: view === 'settings'
    }), /*#__PURE__*/React.createElement(NavItem, {
      icon: "log-out",
      label: "Sign out",
      onClick: () => setSignedIn(false)
    }))
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 'var(--page-padding)'
    },
    key: view
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ledger-rise 180ms ease'
    }
  }, view === 'dashboard' && /*#__PURE__*/React.createElement(DashboardScreen, {
    transactions: transactions,
    budgets: window.LedgerData.budgets,
    months: window.LedgerData.months,
    onAdd: () => setAdding(true)
  }), view === 'transactions' && /*#__PURE__*/React.createElement(TransactionsScreen, {
    transactions: transactions,
    categories: window.LedgerData.categories,
    onAdd: () => setAdding(true),
    onDelete: setDeleting
  }), view === 'budgets' && /*#__PURE__*/React.createElement(BudgetsScreen, {
    budgets: window.LedgerData.budgets,
    onAdd: () => setAdding(true)
  }), (view === 'reports' || view === 'settings') && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 300,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "This view is not defined in the source material."))), /*#__PURE__*/React.createElement(Modal, {
    open: adding,
    title: "Add transaction",
    onClose: () => setAdding(false),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setAdding(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      onClick: save
    }, "Save"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--field-gap)'
    }
  }, /*#__PURE__*/React.createElement(FieldRow, {
    columns: 2
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Date",
    defaultValue: "12 Aug 2026"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Amount",
    prefix: "LKR",
    placeholder: "0.00",
    value: draft.amount,
    onChange: e => setDraft({
      ...draft,
      amount: e.target.value
    })
  })), /*#__PURE__*/React.createElement(FieldRow, {
    columns: 2
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Type",
    value: draft.kind,
    onChange: e => setDraft({
      ...draft,
      kind: e.target.value
    }),
    options: [{
      value: 'expense',
      label: 'Expense'
    }, {
      value: 'income',
      label: 'Income'
    }]
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Category",
    value: draft.cat,
    onChange: e => setDraft({
      ...draft,
      cat: e.target.value
    }),
    options: window.LedgerData.categories
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Description",
    placeholder: "Keells Super",
    value: draft.desc,
    onChange: e => setDraft({
      ...draft,
      desc: e.target.value
    })
  }))), /*#__PURE__*/React.createElement(Modal, {
    open: !!deleting,
    title: "Delete transaction?",
    onClose: () => setDeleting(null),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setDeleting(null)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      onClick: () => {
        setTransactions(transactions.filter(t => t.id !== deleting.id));
        setDeleting(null);
      }
    }, "Delete"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)'
    }
  }, deleting ? deleting.desc + ' · ' : '', deleting ? /*#__PURE__*/React.createElement(Money, {
    amount: deleting.amount,
    kind: deleting.kind
  }) : null, ". This cannot be undone.")));
}
window.LedgerApp = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/BudgetsScreen.jsx
try { (() => {
const {
  Card,
  Table,
  Money,
  Button,
  PageHeader,
  ProgressBar,
  Badge,
  KpiCard
} = window.LedgerDesignSystem_7a4742;
function BudgetsScreen({
  budgets,
  onAdd
}) {
  const limit = budgets.reduce((s, b) => s + b.limit, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Budgets",
    subtitle: "August 2026",
    actions: /*#__PURE__*/React.createElement(Button, {
      icon: "plus",
      onClick: onAdd
    }, "New budget")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Budgeted",
    amount: limit
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Spent",
    amount: spent,
    kind: "expense",
    delta: (spent / limit * 100).toFixed(1) + '% of budget'
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Remaining",
    amount: limit - spent,
    kind: "income"
  })), /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'cat',
      header: 'Category',
      width: '160px'
    }, {
      key: 'usage',
      header: 'Usage',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 240
        }
      }, /*#__PURE__*/React.createElement(ProgressBar, {
        value: r.spent,
        max: r.limit
      }))
    }, {
      key: 'limit',
      header: 'Budget',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Money, {
        amount: r.limit
      })
    }, {
      key: 'spent',
      header: 'Spent',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Money, {
        amount: r.spent,
        kind: "expense"
      })
    }, {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement("span", {
        className: "tabular",
        style: {
          color: r.spent > r.limit ? 'var(--over-budget)' : 'var(--under-budget)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap'
        }
      }, (r.spent > r.limit ? '+' : '−') + 'LKR ' + Math.abs(r.limit - r.spent).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }))
    }, {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: r => r.spent > r.limit ? /*#__PURE__*/React.createElement(Badge, {
        tone: "warning"
      }, "Over budget") : /*#__PURE__*/React.createElement(Badge, {
        tone: "income"
      }, "On track")
    }],
    rows: budgets,
    rowKey: r => r.cat
  })));
}
window.BudgetsScreen = BudgetsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/BudgetsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/DashboardScreen.jsx
try { (() => {
const {
  KpiCard,
  Card,
  Table,
  BarChart,
  Money,
  Badge,
  Button,
  PageHeader,
  ProgressBar
} = window.LedgerDesignSystem_7a4742;
function DashboardScreen({
  transactions,
  budgets,
  months,
  onAdd
}) {
  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const net = income - expense;
  const rate = income > 0 ? (net / income * 100).toFixed(1) + '%' : '—';
  const byCat = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    byCat[t.cat] = (byCat[t.cat] || 0) - t.amount;
  });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
  const catTotal = cats.reduce((s, c) => s + c[1], 0) || 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Dashboard",
    subtitle: "August 2026",
    actions: /*#__PURE__*/React.createElement(Button, {
      icon: "plus",
      onClick: onAdd
    }, "Add transaction")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Income",
    amount: income,
    kind: "income",
    delta: "+4.1% vs Jul"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Expenses",
    amount: expense,
    kind: "expense",
    delta: "\u22122.8% vs Jul"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Net",
    amount: net,
    delta: "Saved this month"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Savings rate",
    value: rate,
    delta: "Target 20.0%"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 'var(--card-gap)',
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Income vs expenses"
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 200,
    data: months,
    series: [{
      key: 'income',
      color: 'var(--income)'
    }, {
      key: 'expense',
      color: 'var(--expense)'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      marginTop: 'var(--space-4)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: 8,
      height: 8,
      background: 'var(--income)',
      borderRadius: 2
    }
  }), "Income"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: 8,
      height: 8,
      background: 'var(--expense)',
      borderRadius: 2
    }
  }), "Expenses"))), /*#__PURE__*/React.createElement(Card, {
    title: "Spend by category"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, cats.map(([cat, amt], i) => /*#__PURE__*/React.createElement("div", {
    key: cat,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", null, cat), /*#__PURE__*/React.createElement(Money, {
    amount: amt
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--surface-muted)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: amt / catTotal * 100 + '%',
      height: '100%',
      background: palette[i % palette.length],
      borderRadius: 'var(--radius-full)'
    }
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 'var(--card-gap)',
      marginTop: 'var(--section-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6) var(--space-6) var(--space-4)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      fontWeight: 600
    }
  }, "Recent transactions"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--accent)'
    }
  }, "View all")), /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'date',
      header: 'Date',
      width: '112px',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap'
        }
      }, r.date)
    }, {
      key: 'desc',
      header: 'Description'
    }, {
      key: 'cat',
      header: 'Category',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.kind
      }, r.cat)
    }, {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Money, {
        amount: r.amount,
        kind: r.kind
      })
    }],
    rows: transactions.slice(0, 5),
    rowKey: r => r.id
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Budgets"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, budgets.slice(0, 4).map(b => /*#__PURE__*/React.createElement("div", {
    key: b.cat,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", null, b.cat), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      color: b.spent > b.limit ? 'var(--over-budget)' : 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, (b.spent / b.limit * 100).toFixed(1), "%")), /*#__PURE__*/React.createElement(ProgressBar, {
    value: b.spent,
    max: b.limit
  })))))));
}
window.DashboardScreen = DashboardScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/LoginScreen.jsx
try { (() => {
const {
  Button,
  Input,
  FieldRow
} = window.LedgerDesignSystem_7a4742;
function LoginScreen({
  onSignIn
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 380,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-8)',
      animation: 'ledger-rise 200ms ease'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--leading-3xl)',
      fontWeight: 600
    }
  }, "Ledger"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-2) 0 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-secondary)'
    }
  }, "Sign in to see where your money went.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-raised)',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--field-gap)'
    }
  }, /*#__PURE__*/React.createElement(FieldRow, null, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    defaultValue: "nimal@example.lk"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    defaultValue: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: onSignIn
  }, "Sign in"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      textAlign: 'center'
    }
  }, "Forgot your password?"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/TransactionsScreen.jsx
try { (() => {
const {
  Card,
  Table,
  Money,
  Badge,
  Button,
  PageHeader,
  Select,
  Input,
  IconButton,
  EmptyState
} = window.LedgerDesignSystem_7a4742;
function TransactionsScreen({
  transactions,
  categories,
  onAdd,
  onDelete
}) {
  const [cat, setCat] = React.useState('All categories');
  const [q, setQ] = React.useState('');
  const rows = transactions.filter(t => (cat === 'All categories' || t.cat === cat) && (q === '' || t.desc.toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Transactions",
    subtitle: "August 2026 \xB7 8 entries",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      icon: "download"
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      icon: "plus",
      onClick: onAdd
    }, "Add transaction"))
  }), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 260
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search descriptions",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: cat,
    onChange: e => setCat(e.target.value),
    options: ['All categories', ...categories]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 160
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['All accounts', 'Sampath debit', 'Commercial savings', 'Cash']
  }))), rows.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "receipt",
    message: 'No transactions match "' + q + '".',
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => {
        setQ('');
        setCat('All categories');
      }
    }, "Clear filters")
  }) : /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'date',
      header: 'Date',
      width: '112px',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          whiteSpace: 'nowrap'
        }
      }, r.date)
    }, {
      key: 'desc',
      header: 'Description'
    }, {
      key: 'cat',
      header: 'Category',
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.kind
      }, r.cat)
    }, {
      key: 'account',
      header: 'Account'
    }, {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(Money, {
        amount: r.amount,
        kind: r.kind
      })
    }, {
      key: 'actions',
      header: '',
      align: 'right',
      width: '84px',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement(IconButton, {
        icon: "pencil",
        label: "Edit"
      }), /*#__PURE__*/React.createElement(IconButton, {
        icon: "trash-2",
        label: "Delete",
        tone: "danger",
        onClick: () => onDelete(r)
      }))
    }],
    rows: rows,
    rowKey: r => r.id
  })));
}
window.TransactionsScreen = TransactionsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/TransactionsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/ledger-app/data.js
try { (() => {
window.LedgerData = {
  months: [{
    label: 'Apr',
    income: 388000,
    expense: 302400
  }, {
    label: 'May',
    income: 392000,
    expense: 281000
  }, {
    label: 'Jun',
    income: 401000,
    expense: 298400
  }, {
    label: 'Jul',
    income: 395600,
    expense: 282800
  }, {
    label: 'Aug',
    income: 412000,
    expense: 274950
  }],
  transactions: [{
    id: 't1',
    date: '12 Aug 2026',
    desc: 'Keells Super',
    cat: 'Groceries',
    account: 'Sampath debit',
    amount: -18500,
    kind: 'expense'
  }, {
    id: 't2',
    date: '11 Aug 2026',
    desc: 'PickMe rides',
    cat: 'Transport',
    account: 'Sampath debit',
    amount: -3260,
    kind: 'expense'
  }, {
    id: 't3',
    date: '10 Aug 2026',
    desc: 'Salary — August',
    cat: 'Salary',
    account: 'Commercial savings',
    amount: 412000,
    kind: 'income'
  }, {
    id: 't4',
    date: '08 Aug 2026',
    desc: 'CEB electricity',
    cat: 'Utilities',
    account: 'Standing order',
    amount: -9740,
    kind: 'expense'
  }, {
    id: 't5',
    date: '05 Aug 2026',
    desc: 'Rent — Nugegoda',
    cat: 'Rent',
    account: 'Standing order',
    amount: -95000,
    kind: 'expense'
  }, {
    id: 't6',
    date: '04 Aug 2026',
    desc: 'Dialog broadband',
    cat: 'Utilities',
    account: 'Sampath debit',
    amount: -6900,
    kind: 'expense'
  }, {
    id: 't7',
    date: '03 Aug 2026',
    desc: 'Freelance invoice #14',
    cat: 'Freelance',
    account: 'Commercial savings',
    amount: 62500,
    kind: 'income'
  }, {
    id: 't8',
    date: '02 Aug 2026',
    desc: 'Arpico household',
    cat: 'Groceries',
    account: 'Cash',
    amount: -7420,
    kind: 'expense'
  }],
  budgets: [{
    cat: 'Rent',
    limit: 95000,
    spent: 95000
  }, {
    cat: 'Groceries',
    limit: 45000,
    spent: 38200
  }, {
    cat: 'Transport',
    limit: 15000,
    spent: 11480
  }, {
    cat: 'Utilities',
    limit: 18000,
    spent: 19640
  }, {
    cat: 'Dining',
    limit: 20000,
    spent: 14300
  }, {
    cat: 'Health',
    limit: 12000,
    spent: 4100
  }],
  categories: ['Groceries', 'Transport', 'Utilities', 'Rent', 'Dining', 'Health', 'Salary', 'Freelance']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ledger-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Money = __ds_scope.Money;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.KpiCard = __ds_scope.KpiCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.FieldRow = __ds_scope.FieldRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.Sidebar = __ds_scope.Sidebar;

})();
