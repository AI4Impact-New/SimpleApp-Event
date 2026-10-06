/* @ds-bundle: {"format":4,"namespace":"AI4ImpactDesignSystem_a75035","components":[{"name":"CellGrid","sourcePath":"components/cards/CellGrid.jsx"},{"name":"Certificate","sourcePath":"components/cards/Certificate.jsx"},{"name":"CheckCard","sourcePath":"components/cards/CheckCard.jsx"},{"name":"CodeWindow","sourcePath":"components/cards/CodeWindow.jsx"},{"name":"FeatureCell","sourcePath":"components/cards/FeatureCell.jsx"},{"name":"ModuleCell","sourcePath":"components/cards/ModuleCell.jsx"},{"name":"ProjectCard","sourcePath":"components/cards/ProjectCard.jsx"},{"name":"StepCell","sourcePath":"components/cards/StepCell.jsx"},{"name":"TrackCard","sourcePath":"components/cards/TrackCard.jsx"},{"name":"TrainerCard","sourcePath":"components/cards/TrainerCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"CompareTable","sourcePath":"components/data/CompareTable.jsx"},{"name":"MetaGrid","sourcePath":"components/data/MetaGrid.jsx"},{"name":"Stat","sourcePath":"components/data/Stat.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"ChoiceOption","sourcePath":"components/forms/ChoiceOption.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"AnnouncementBar","sourcePath":"components/navigation/AnnouncementBar.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"SectionHeader","sourcePath":"components/navigation/SectionHeader.jsx"}],"sourceHashes":{"components/cards/CellGrid.jsx":"fe21ced292bd","components/cards/Certificate.jsx":"cc12dc407d3f","components/cards/CheckCard.jsx":"7086c205a53f","components/cards/CodeWindow.jsx":"d9ee1e405938","components/cards/FeatureCell.jsx":"2e073a02474e","components/cards/ModuleCell.jsx":"0b49d6b41104","components/cards/ProjectCard.jsx":"8f7fce0045c5","components/cards/StepCell.jsx":"11d8f3aed5f0","components/cards/TrackCard.jsx":"1b05e17367fd","components/cards/TrainerCard.jsx":"91cee5194be6","components/core/Badge.jsx":"e902af642d51","components/core/Button.jsx":"582514f7618c","components/core/Chip.jsx":"c4135b2b835a","components/core/Eyebrow.jsx":"ac9d3216773e","components/core/Icon.jsx":"69b198b1e1e8","components/core/Logo.jsx":"ecdc6118415d","components/data/CompareTable.jsx":"fd741d239186","components/data/MetaGrid.jsx":"db503c11059f","components/data/Stat.jsx":"9b192a023ed7","components/forms/Checkbox.jsx":"9c769a3237cc","components/forms/ChoiceOption.jsx":"9983da3c88bf","components/forms/Input.jsx":"a1e932c9b402","components/forms/Select.jsx":"cec24c18d84e","components/navigation/AnnouncementBar.jsx":"446e462599e4","components/navigation/Footer.jsx":"95ca787d42d3","components/navigation/NavBar.jsx":"7d2b462ba3d3","components/navigation/SectionHeader.jsx":"b75d8c2b0d05","ui_kits/website/CoursesScreen.jsx":"6b7c97f13dff","ui_kits/website/HomeHero.jsx":"4ce6342a03bc","ui_kits/website/HomeSections.jsx":"61c571940eb0","ui_kits/website/Shared.jsx":"1163e0c46e19","ui_kits/website/data.jsx":"007766460ad4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AI4ImpactDesignSystem_a75035 = window.AI4ImpactDesignSystem_a75035 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/CellGrid.jsx
try { (() => {
function CellGrid({
  columns = 4,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))',
      gap: 1,
      background: 'var(--border-default)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-3xl)',
      overflow: 'hidden',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { CellGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CellGrid.jsx", error: String((e && e.message) || e) }); }

// components/cards/Certificate.jsx
try { (() => {
function Field({
  label,
  value,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 7px/1 var(--font-mono)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: mono ? '400 8px/1.2 var(--font-mono)' : '500 8px/1.2 var(--font-body)',
      color: 'var(--text-strong)'
    }
  }, value));
}
function Certificate({
  learner = 'Sample Learner',
  programme = 'Forward Deployed AI Engineer',
  capstone = 'Payments reconciliation copilot engagement',
  assessment = 'Passed with distinction',
  issued = '20 Mar 2026',
  credentialId = 'IIAA-FDE-2026-000123',
  sample = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cream-50)',
      borderRadius: 'var(--radius-3xl)',
      padding: 16,
      boxShadow: 'var(--shadow-float)',
      border: '1px solid #efeadf',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1.5px solid var(--cream-200)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 20px 18px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 300,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 5,
      background: 'var(--navy-800)',
      color: 'var(--white)',
      font: '700 7px/18px var(--font-display)',
      textAlign: 'center'
    }
  }, "A4"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 8px/1 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, "AI4Impact Institute of Applied AI (IIAA)"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 7px/1 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, "in academic collaboration with XYZ University"))), sample ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 6px/1 var(--font-mono)',
      letterSpacing: '0.2em',
      color: 'var(--text-muted)'
    }
  }, "SAMPLE") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 7px/1 var(--font-mono)',
      letterSpacing: '0.25em',
      color: 'var(--text-muted)'
    }
  }, "THIS CERTIFIES THAT"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 22px/1.1 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, learner), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 7px/1 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, "has met the assessed standard for the"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 10px/1.2 var(--font-display)',
      color: 'var(--teal-700)',
      textAlign: 'center'
    }
  }, "AI4Impact Professional Certificate in ", programme)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr 1fr 56px',
      gap: 12,
      alignItems: 'end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Course",
    value: programme
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Capstone",
    value: capstone
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Assessment",
    value: assessment
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Issued",
    value: issued
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Credential ID",
    value: credentialId,
    mono: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--cream-200)',
      paddingTop: 4,
      font: '400 7px/1 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, "Director, IIAA")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--cream-200)',
      paddingTop: 4,
      font: '400 7px/1 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, "Dean, XYZ University"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      border: '1px dashed var(--slate-400)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '400 7px/1 var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, "QR"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 6px/1 var(--font-mono)',
      color: 'var(--text-muted)'
    }
  }, "ai4impact.in/verify")))));
}
Object.assign(__ds_scope, { Certificate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Certificate.jsx", error: String((e && e.message) || e) }); }

// components/cards/CodeWindow.jsx
try { (() => {
function CodeWindow({
  title,
  children,
  style,
  bodyStyle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--navy-950)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 36,
      padding: '0 12px',
      borderBottom: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 9,
      background: 'var(--navy-500)'
    }
  }), /*#__PURE__*/React.createElement("i", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 9,
      background: 'var(--navy-500)'
    }
  }), /*#__PURE__*/React.createElement("i", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 9,
      background: 'var(--navy-500)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 11px/1 var(--font-mono)',
      color: 'var(--text-on-dark-body)'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 14px',
      font: '400 11px/1.75 var(--font-mono)',
      color: 'var(--text-on-dark-body)',
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { CodeWindow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CodeWindow.jsx", error: String((e && e.message) || e) }); }

// components/cards/ModuleCell.jsx
try { (() => {
function ModuleCell({
  title,
  description,
  note,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      padding: '24px 24px 26px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 18px/1.25 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 8,
      font: '400 13px/1.7 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, description), note ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 6,
      font: '400 12px/1.5 var(--font-body)',
      color: 'var(--text-muted)'
    }
  }, note) : null);
}
Object.assign(__ds_scope, { ModuleCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ModuleCell.jsx", error: String((e && e.message) || e) }); }

// components/cards/ProjectCard.jsx
try { (() => {
function ProjectCard({
  windowTitle,
  preview,
  title,
  description,
  tags = [],
  theme = 'dark',
  style
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: dark ? 'var(--surface-dark-raised)' : 'var(--surface-card)',
      border: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-3xl)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, preview ? /*#__PURE__*/React.createElement(__ds_scope.CodeWindow, {
    title: windowTitle,
    style: {
      marginBottom: 20
    }
  }, preview) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 18px/1.25 var(--font-display)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 10,
      font: '400 14px/1.65 var(--font-body)',
      color: dark ? 'var(--text-on-dark-body)' : 'var(--text-body)'
    }
  }, description), tags.length ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: '1px solid ' + (dark ? 'var(--border-dark)' : 'var(--border-default)'),
      font: '400 13px/1.5 var(--font-body)',
      color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-muted)'
    }
  }, tags.join(' · ')) : null);
}
Object.assign(__ds_scope, { ProjectCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ProjectCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/StepCell.jsx
try { (() => {
function StepCell({
  number,
  title,
  subtitle,
  description,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      padding: '24px 22px 28px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 13px/1 var(--font-body)',
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, number), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 14,
      font: '700 22px/1.1 var(--font-display)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 10,
      font: '500 14px/1.45 var(--font-body)',
      color: 'var(--text-strong)'
    }
  }, subtitle), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 8,
      font: '400 13px/1.7 var(--font-body)',
      color: 'var(--text-body)',
      textWrap: 'pretty'
    }
  }, description));
}
Object.assign(__ds_scope, { StepCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/StepCell.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  neutral: {
    background: 'var(--slate-100)',
    color: 'var(--slate-700)',
    border: '1px solid var(--border-default)'
  },
  promo: {
    background: 'var(--amber-500)',
    color: 'var(--amber-950)',
    border: '1px solid var(--amber-500)'
  },
  accent: {
    background: 'var(--teal-100)',
    color: 'var(--teal-700)',
    border: '1px solid var(--teal-100)'
  },
  dark: {
    background: 'var(--navy-800)',
    color: 'var(--white)',
    border: '1px solid var(--navy-800)'
  }
};
function Badge({
  tone = 'neutral',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 9px',
      borderRadius: 'var(--radius-pill)',
      font: '500 12px/1 var(--font-body)',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...TONES[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
const V = {
  outline: {
    height: 30,
    padding: '0 15px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--border-default)',
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    font: '400 14px/1 var(--font-body)'
  },
  tag: {
    height: 22,
    padding: '0 7px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--navy-600)',
    color: 'var(--text-on-dark)',
    font: '400 11px/1 var(--font-mono)'
  },
  code: {
    height: 22,
    padding: '0 6px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--teal-500)',
    color: 'var(--teal-400)',
    font: '400 11px/1 var(--font-mono)'
  },
  'code-amber': {
    height: 22,
    padding: '0 6px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--amber-500)',
    color: 'var(--amber-500)',
    font: '400 11px/1 var(--font-mono)'
  }
};
function Chip({
  variant = 'outline',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...V[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
const TONES = {
  accent: 'var(--text-body)',
  onDark: 'var(--text-on-dark-body)',
  promo: 'var(--text-on-dark-body)',
  muted: 'var(--text-muted)'
};
function Eyebrow({
  tone = 'accent',
  line = false,
  children,
  style
}) {
  const c = TONES[tone] || TONES.accent;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      font: '500 14px/1.3 var(--font-body)',
      color: c,
      ...style
    }
  }, line ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 1,
      background: c,
      flexShrink: 0
    }
  }) : null, /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
const LUCIDE_URL = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
let loading = null;
function loadLucide() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.lucide) return Promise.resolve(window.lucide);
  if (!loading) {
    loading = new Promise(function (res) {
      const s = document.createElement('script');
      s.src = LUCIDE_URL;
      s.onload = function () {
        res(window.lucide);
      };
      s.onerror = function () {
        res(null);
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}
function pascal(n) {
  return n.split('-').map(function (s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }).join('');
}
function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  color = 'currentColor',
  style
}) {
  const [lib, setLib] = React.useState(typeof window !== 'undefined' ? window.lucide || null : null);
  React.useEffect(function () {
    if (!lib) loadLucide().then(function (l) {
      if (l) setLib(l);
    });
  }, []);
  let node = lib && (lib.icons && lib.icons[pascal(name)] || lib[pascal(name)]);
  let kids = [];
  if (Array.isArray(node)) kids = node[0] === 'svg' ? node[2] || [] : node;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style
    }
  }, kids.map(function (k, i) {
    return React.createElement(k[0], {
      key: i,
      ...k[1]
    });
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/cards/CheckCard.jsx
try { (() => {
function CheckCard({
  eyebrow,
  title,
  subtitle,
  items = [],
  footer,
  highlighted = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: highlighted ? '2px solid var(--teal-600)' : '1px solid var(--border-default)',
      borderRadius: 'var(--radius-3xl)',
      padding: highlighted ? '23px 25px 21px' : '24px 26px 22px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: "muted"
  }, eyebrow) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 14,
      font: '700 20px/1.2 var(--font-display)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 10,
      font: '400 14px/1.5 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, subtitle) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginTop: 18
    }
  }, items.map(function (it, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        font: '400 14px/1.4 var(--font-body)',
        color: 'var(--text-strong)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check",
      size: 14,
      color: "var(--text-strong)"
    }), it);
  })), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      paddingTop: 18,
      borderTop: '1px solid var(--border-default)',
      font: '500 13px/1.4 var(--font-body)',
      color: 'var(--text-strong)'
    }
  }, footer) : null);
}
Object.assign(__ds_scope, { CheckCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CheckCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/FeatureCell.jsx
try { (() => {
function FeatureCell({
  icon,
  title,
  description,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      padding: '22px 22px 26px',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: "var(--text-strong)"
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 18,
      font: '600 17px/1.25 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 10,
      font: '400 13px/1.7 var(--font-body)',
      color: 'var(--text-body)',
      textWrap: 'pretty'
    }
  }, description));
}
Object.assign(__ds_scope, { FeatureCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FeatureCell.jsx", error: String((e && e.message) || e) }); }

// components/cards/TrainerCard.jsx
try { (() => {
function TrainerCard({
  name,
  initials,
  subtitle,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: function () {
      setHover(true);
    },
    onMouseLeave: function () {
      setHover(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px 12px 12px',
      background: 'var(--surface-card)',
      border: '1px solid ' + (hover ? 'var(--border-strong)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-3xl)',
      cursor: 'pointer',
      minWidth: 0,
      transition: 'border-color var(--dur-base) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 13px/1 var(--font-display)',
      flexShrink: 0,
      background: 'var(--slate-100)',
      color: 'var(--text-strong)'
    }
  }, initials), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1.2 var(--font-display)',
      color: 'var(--text-strong)'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 13px/1.3 var(--font-body)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, subtitle)), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 14,
    color: "var(--text-muted)"
  }));
}
Object.assign(__ds_scope, { TrainerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/TrainerCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 30,
    px: 16,
    fs: 14,
    r: 8,
    gap: 8
  },
  md: {
    h: 38,
    px: 18,
    fs: 15,
    r: 8,
    gap: 8
  },
  lg: {
    h: 46,
    px: 22,
    fs: 16,
    r: 10,
    gap: 10
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--navy-800)',
    color: 'var(--white)',
    border: '1px solid var(--navy-800)'
  },
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    border: '1px solid var(--border-default)'
  },
  light: {
    background: 'var(--slate-100)',
    color: 'var(--text-strong)',
    border: '1px solid var(--slate-100)'
  },
  'dark-ghost': {
    background: 'var(--surface-dark-raised)',
    color: 'var(--text-on-dark)',
    border: '1px solid var(--border-dark-strong)'
  },
  promo: {
    background: 'var(--amber-500)',
    color: 'var(--amber-950)',
    border: '1px solid var(--amber-500)'
  },
  link: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '1px solid transparent'
  }
};
const HOVER = {
  primary: {
    background: 'var(--navy-700)'
  },
  outline: {
    borderColor: 'var(--border-strong)'
  },
  light: {
    background: 'var(--white)'
  },
  'dark-ghost': {
    borderColor: 'var(--slate-500)'
  },
  promo: {
    background: 'var(--amber-600)'
  },
  link: {
    color: 'var(--text-strong)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  leadingIcon,
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  href,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const isLink = variant === 'link';
  const base = {
    display: fullWidth ? 'flex' : 'inline-flex',
    width: fullWidth ? '100%' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: isLink ? 'auto' : s.h,
    padding: isLink ? 0 : '0 ' + s.px + 'px',
    borderRadius: s.r,
    font: '500 ' + s.fs + 'px/1 var(--font-body)',
    whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    textDecoration: 'none',
    transition: 'background var(--dur-base) var(--ease-out),border-color var(--dur-base) var(--ease-out),color var(--dur-base) var(--ease-out)',
    boxSizing: 'border-box',
    ...VARIANTS[variant],
    ...(hover && !disabled ? HOVER[variant] : null),
    ...style
  };
  const Tag = href ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    onClick: disabled ? undefined : onClick,
    disabled: Tag === 'button' ? disabled : undefined,
    style: base,
    onMouseEnter: function () {
      setHover(true);
    },
    onMouseLeave: function () {
      setHover(false);
    }
  }, leadingIcon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: leadingIcon,
    size: s.fs + 2
  }) : null, children, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.fs
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
function Logo({
  variant = 'light',
  height = 32,
  basePath = '',
  style
}) {
  const src = basePath + 'assets/' + (variant === 'dark' ? 'logo-dark.png' : 'logo-light.png');
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "AI4Impact",
    style: {
      height: height,
      width: 'auto',
      maxWidth: 'none',
      display: 'block',
      alignSelf: 'flex-start',
      flexShrink: 0,
      objectFit: 'contain',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/data/CompareTable.jsx
try { (() => {
function CompareTable({
  columns = [],
  rows = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-3xl)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(function (c, i) {
    return /*#__PURE__*/React.createElement("th", {
      key: i,
      style: {
        textAlign: c.align || 'left',
        padding: '0 20px',
        height: 40,
        background: 'var(--slate-50)',
        borderBottom: '1px solid var(--border-default)',
        font: '500 13px/1 var(--font-body)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap'
      }
    }, c.label);
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map(function (r, ri) {
    return /*#__PURE__*/React.createElement("tr", {
      key: ri
    }, columns.map(function (c, ci) {
      return /*#__PURE__*/React.createElement("td", {
        key: ci,
        style: {
          textAlign: c.align || 'left',
          padding: '0 20px',
          height: 48,
          borderTop: ri === 0 ? 'none' : '1px solid var(--border-default)',
          font: ci === 0 ? '500 14px/1.3 var(--font-body)' : '400 14px/1.3 var(--font-body)',
          fontVariantNumeric: 'tabular-nums',
          color: c.muted ? 'var(--text-muted)' : 'var(--text-strong)',
          whiteSpace: ci === 0 ? 'normal' : 'nowrap'
        }
      }, r[c.key]);
    }));
  }))));
}
Object.assign(__ds_scope, { CompareTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CompareTable.jsx", error: String((e && e.message) || e) }); }

// components/data/MetaGrid.jsx
try { (() => {
function MetaGrid({
  items = [],
  columns = 2,
  theme = 'light',
  style
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))',
      columnGap: 24,
      rowGap: 14,
      ...style
    }
  }, items.map(function (it, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '400 13px/1.3 var(--font-body)',
        color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-muted)'
      }
    }, it.label), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '500 15px/1.4 var(--font-body)',
        color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)'
      }
    }, it.value));
  }));
}
Object.assign(__ds_scope, { MetaGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetaGrid.jsx", error: String((e && e.message) || e) }); }

// components/cards/TrackCard.jsx
try { (() => {
function TrackCard({
  number,
  family,
  title,
  description,
  badge,
  meta = [],
  onExplore,
  onEnrol,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-3xl)',
      padding: 24,
      boxSizing: 'border-box',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 13px/1 var(--font-body)',
      color: 'var(--text-muted)'
    }
  }, family), badge ? /*#__PURE__*/React.createElement(__ds_scope.Badge, null, badge) : null), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '14px 0 0',
      font: '700 20px/1.25 var(--font-display)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)',
      textWrap: 'balance'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      font: '400 14px/1.65 var(--font-body)',
      color: 'var(--text-body)',
      textWrap: 'pretty'
    }
  }, description), /*#__PURE__*/React.createElement(__ds_scope.MetaGrid, {
    items: meta.slice(0, 2),
    style: {
      marginTop: 20,
      paddingTop: 18,
      borderTop: '1px solid var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "primary",
    onClick: onExplore,
    style: {
      flex: 1
    }
  }, "Explore course"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "outline",
    onClick: onEnrol,
    style: {
      flex: 1
    }
  }, "Enrol")));
}
Object.assign(__ds_scope, { TrackCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/TrackCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Stat.jsx
try { (() => {
function Stat({
  value,
  label,
  theme = 'dark',
  style
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 32px/1 var(--font-display)',
      letterSpacing: '-0.02em',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 14px/1.3 var(--font-body)',
      color: dark ? 'var(--text-on-dark-body)' : 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Stat.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  defaultChecked = false,
  onChange,
  theme = 'dark',
  children,
  style
}) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const dark = theme === 'dark';
  function toggle() {
    const n = !on;
    if (checked === undefined) setInner(n);
    if (onChange) onChange(n);
  }
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      cursor: 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      marginTop: 2,
      flexShrink: 0,
      borderRadius: 'var(--radius-xs)',
      border: '1px solid ' + (on ? 'var(--teal-500)' : dark ? 'var(--border-dark-strong)' : 'var(--border-strong)'),
      background: on ? 'var(--teal-500)' : dark ? 'var(--surface-dark-raised)' : 'var(--surface-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box'
    }
  }, on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    strokeWidth: 3,
    color: "var(--white)"
  }) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 13px/1.55 var(--font-body)',
      color: dark ? 'var(--text-on-dark-body)' : 'var(--text-body)'
    }
  }, children));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/ChoiceOption.jsx
try { (() => {
function ChoiceOption({
  selected = false,
  onClick,
  children,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: function () {
      setHover(true);
    },
    onMouseLeave: function () {
      setHover(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: 56,
      padding: '0 21px',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid ' + (selected ? 'var(--teal-600)' : hover ? 'var(--border-strong)' : 'var(--border-default)'),
      background: selected ? '#d9ebed' : 'var(--surface-card)',
      color: 'var(--text-strong)',
      font: '500 16px/1 var(--font-body)',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'border-color var(--dur-base) var(--ease-out),background var(--dur-base) var(--ease-out)',
      boxSizing: 'border-box',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ChoiceOption });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ChoiceOption.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  type = 'text',
  theme = 'dark',
  style
}) {
  const dark = theme === 'dark';
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: 0,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 15px/1.2 var(--font-body)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    onFocus: function () {
      setFocus(true);
    },
    onBlur: function () {
      setFocus(false);
    },
    style: {
      height: 34,
      padding: '0 12px',
      borderRadius: 'var(--radius-input)',
      border: '1px solid ' + (focus ? 'var(--teal-500)' : dark ? 'var(--border-dark-strong)' : 'var(--border-default)'),
      background: dark ? 'var(--surface-dark-input)' : 'var(--surface-card)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)',
      font: '400 15px/1 var(--font-body)',
      outline: 'none',
      boxSizing: 'border-box',
      width: '100%',
      transition: 'border-color var(--dur-base) var(--ease-out)'
    }
  }));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  theme = 'dark',
  style
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: 0,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 15px/1.2 var(--font-body)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: 36,
      padding: '0 36px 0 16px',
      borderRadius: 'var(--radius-input)',
      border: '1px solid ' + (dark ? 'var(--border-dark-strong)' : 'var(--border-default)'),
      background: dark ? 'var(--surface-dark-raised)' : 'var(--surface-card)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)',
      font: '400 15px/1 var(--font-body)',
      outline: 'none',
      cursor: 'pointer'
    }
  }, options.map(function (o) {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)',
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AnnouncementBar.jsx
try { (() => {
function AnnouncementBar({
  items = [],
  ctaLabel = 'Register free',
  onCta,
  style
}) {
  const seq = items.concat(items);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      background: 'var(--surface-topbar)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'hidden',
      maskImage: 'linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 60px),transparent)',
      WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 60px),transparent)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 32,
      width: 'max-content',
      animation: 'ai4-marquee 40s linear infinite'
    }
  }, seq.map(function (t, i) {
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '500 14px/1 var(--font-body)',
        color: 'var(--text-on-dark)',
        whiteSpace: 'nowrap'
      }
    }, t), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-on-dark-muted)'
      }
    }, "\xB7"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 13px 0 12px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "light",
    size: "sm",
    icon: "arrow-right",
    onClick: onCta,
    style: {
      height: 26,
      padding: '0 10px',
      fontSize: 13
    }
  }, ctaLabel)), /*#__PURE__*/React.createElement("style", null, '@keyframes ai4-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}'));
}
Object.assign(__ds_scope, { AnnouncementBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AnnouncementBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
function Footer({
  columns = [],
  tagline = 'Learn AI. Build real systems. Create impact.',
  note,
  legal,
  legalRight,
  basePath = '',
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-dark)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '48px var(--container-pad) 40px',
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr 1fr 1fr',
      gap: 48,
      alignItems: 'start',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 16,
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "dark",
    basePath: basePath,
    height: 30
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: '400 17px/1.5 var(--font-display)',
      color: 'var(--text-on-dark)'
    }
  }, tagline), note ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: '400 12px/1.65 var(--font-body)',
      color: 'var(--text-on-dark-muted)'
    }
  }, note) : null), columns.map(function (c) {
    return /*#__PURE__*/React.createElement("div", {
      key: c.title,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '500 14px/1 var(--font-body)',
        color: 'var(--text-on-dark)',
        marginBottom: 6
      }
    }, c.title), c.links.map(function (l) {
      return /*#__PURE__*/React.createElement("a", {
        key: l,
        style: {
          font: '400 14px/1.4 var(--font-body)',
          color: 'var(--text-on-dark-body)',
          cursor: 'pointer'
        }
      }, l);
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '20px var(--container-pad) 24px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: 24,
      font: '400 12px/1.5 var(--font-body)',
      color: 'var(--text-on-dark-muted)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("span", null, legal), /*#__PURE__*/React.createElement("span", null, legalRight))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function NavBar({
  links = [],
  active,
  onNavigate,
  basePath = '',
  onLogin,
  onGuidance,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      background: 'var(--slate-50)',
      borderBottom: '1px solid var(--border-default)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '0 var(--container-pad)',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: function () {
      onNavigate && onNavigate('home');
    },
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    basePath: basePath,
    height: 30
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 24,
      marginLeft: 'auto',
      marginRight: 'auto',
      height: '100%'
    }
  }, links.map(function (l) {
    const on = l.id === active;
    return /*#__PURE__*/React.createElement("a", {
      key: l.id,
      onClick: function () {
        onNavigate && onNavigate(l.id);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        font: '400 14px/1 var(--font-body)',
        color: on ? 'var(--text-strong)' : 'var(--text-body)',
        fontWeight: on ? 500 : 400,
        cursor: 'pointer',
        textDecoration: 'none',
        boxShadow: on ? 'inset 0 -2px 0 var(--teal-600)' : 'none',
        whiteSpace: 'nowrap'
      }
    }, l.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: onGuidance,
    style: {
      font: '500 14px/1 var(--font-body)',
      color: 'var(--text-strong)',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, "Free career guidance"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    size: "sm",
    leadingIcon: "log-in",
    onClick: onLogin,
    style: {
      height: 32,
      padding: '0 10px'
    }
  }, "Student login"))));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionHeader.jsx
try { (() => {
function SectionHeader({
  eyebrow,
  eyebrowTone,
  title,
  lead,
  theme = 'light',
  size = 'md',
  aside,
  style
}) {
  const dark = theme === 'dark';
  const fs = size === 'lg' ? 52 : size === 'sm' ? 36 : 44;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 32,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 760
    }
  }, eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: eyebrowTone || (dark ? 'onDark' : 'accent')
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: eyebrow ? '18px 0 0' : 0,
      font: '700 ' + fs + 'px/1.04 var(--font-display)',
      letterSpacing: '-0.03em',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-strong)',
      textWrap: 'balance'
    }
  }, title), lead ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '18px 0 0',
      maxWidth: 620,
      font: '400 17px/1.7 var(--font-body)',
      color: dark ? 'var(--text-on-dark-body)' : 'var(--text-body)',
      textWrap: 'pretty'
    }
  }, lead) : null), aside ? /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, aside) : null);
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/CoursesScreen.jsx
try { (() => {
function CoursesScreen({
  onNavigate
}) {
  const {
    SectionHeader,
    Eyebrow
  } = window.AI4ImpactDesignSystem_a75035;
  const by = f => AI4.tracks.filter(t => t.fam === f).map((t, i) => ({
    ...t,
    n: String(i + 1).padStart(2, '0')
  }));
  const groups = [['Build', 'Build tracks', 'Ship AI systems into production.', 'page'], ['Data', 'Data tracks', 'Build the data that AI runs on.', 'alt'], ['Product', 'Product tracks', 'Decide what gets built, and why.', 'page']];
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Career tracks"
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-hero)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '96px var(--container-pad) 104px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: '700 56px/1.02 var(--font-display)',
      letterSpacing: '-0.035em',
      color: 'var(--text-on-dark)'
    }
  }, "Pick the role", /*#__PURE__*/React.createElement("br", null), "you want to do."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '26px 0 0',
      maxWidth: 600,
      font: '400 17px/1.75 var(--font-body)',
      color: 'var(--text-on-dark-body)'
    }
  }, "Each track is designed backwards from a job: what it ships, what it is measured on and what a hiring manager checks."))), groups.map(g => /*#__PURE__*/React.createElement(Section, {
    key: g[0],
    tone: g[3],
    pad: 96
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: g[1],
    title: g[2],
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(TrackGrid, {
    tracks: by(g[0]),
    onExplore: () => onNavigate('guidance')
  })))), /*#__PURE__*/React.createElement(CompareSection, null), /*#__PURE__*/React.createElement(GuidanceSection, null));
}
Object.assign(window, {
  CoursesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/CoursesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeHero.jsx
try { (() => {
function HeroVisual() {
  const {
    Icon
  } = window.AI4ImpactDesignSystem_a75035;
  const row = (t, done) => /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      font: '400 14px/1.3 var(--font-body)',
      color: done ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: done ? 'circle-check' : 'circle-dashed',
    size: 15,
    color: done ? 'var(--teal-400)' : 'var(--text-on-dark-muted)'
  }), t);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark-raised)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-3xl)',
      padding: '28px 28px 30px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 17px/1.3 var(--font-display)',
      color: 'var(--text-on-dark)'
    }
  }, "Data & AI Platform Engineer"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 13px/1 var(--font-body)',
      color: 'var(--text-on-dark-body)',
      whiteSpace: 'nowrap'
    }
  }, "Week 9 of 16")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 4,
      background: 'var(--navy-600)',
      margin: '18px 0 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '56%',
      height: '100%',
      borderRadius: 4,
      background: 'var(--teal-400)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, row('Lakehouse ingestion pipeline — reviewed', true), row('Data-quality suite — reviewed', true), row('Capstone — in progress', false)));
}
function HomeHero({
  onNavigate
}) {
  const {
    Eyebrow,
    Button,
    Stat
  } = window.AI4ImpactDesignSystem_a75035;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-hero)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '96px var(--container-pad) 100px',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      gap: 72,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: '700 68px/0.98 var(--font-display)',
      letterSpacing: '-0.035em',
      color: 'var(--text-on-dark)'
    }
  }, "Choose the role.", /*#__PURE__*/React.createElement("br", null), "Build the skills.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--teal-400)'
    }
  }, "Prove you can do the work.")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '28px 0 0',
      maxWidth: 560,
      font: '400 17px/1.75 var(--font-body)',
      color: 'var(--text-on-dark-body)'
    }
  }, "AI4Impact combines structured learning, real-world projects, personal guidance and career acceleration to help you move from learning AI to doing the work."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "light",
    size: "lg",
    icon: "arrow-right",
    onClick: () => onNavigate('tracks')
  }, "Explore career tracks"), /*#__PURE__*/React.createElement(Button, {
    variant: "dark-ghost",
    size: "lg",
    onClick: () => onNavigate('guidance')
  }, "Book free career guidance"))), /*#__PURE__*/React.createElement(HeroVisual, null)));
}
Object.assign(window, {
  HomeHero,
  HeroVisual
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeSections.jsx
try { (() => {
function TracksSection({
  onNavigate,
  onExplore
}) {
  const {
    SectionHeader,
    Button
  } = window.AI4ImpactDesignSystem_a75035;
  return /*#__PURE__*/React.createElement(Section, {
    id: "tracks-home"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Career tracks",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Six roles. One standard:", /*#__PURE__*/React.createElement("br", null), "can you do the work?"),
    lead: "Every track is built backwards from a real job: what the role does, what it ships and what hiring managers check.",
    aside: /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      size: "sm",
      icon: "arrow-right",
      onClick: () => onNavigate('compare')
    }, "Compare all tracks")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 40
    }
  }, /*#__PURE__*/React.createElement(TrackGrid, {
    tracks: AI4.tracks,
    onExplore: onExplore
  })));
}
function FinderSection({
  onNavigate
}) {
  const {
    SectionHeader,
    ChoiceOption,
    Eyebrow,
    MetaGrid,
    Button
  } = window.AI4ImpactDesignSystem_a75035;
  const [sel, setSel] = React.useState(0);
  const t = AI4.tracks.find(x => x.id === AI4.finder[sel][1]);
  const items = [{
    label: "You'll need",
    value: t.need || t.level
  }, {
    label: 'Time',
    value: t.dur + ' · ' + t.weekly + '/week'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "finder",
    tone: "alt"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Is this right for me?",
    title: "Start from where you want to be."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 40,
      marginTop: 48,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 14px/1 var(--font-body)',
      color: 'var(--text-body)',
      marginBottom: 10
    }
  }, "What do you want to be doing in a year?"), AI4.finder.map((f, i) => /*#__PURE__*/React.createElement(ChoiceOption, {
    key: f[0],
    selected: i === sel,
    onClick: () => setSel(i)
  }, f[0]))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-3xl)',
      padding: '34px 32px 30px'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    line: false
  }, "Your best-fit track"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '26px 0 0',
      font: '700 28px/1.15 var(--font-display)',
      letterSpacing: '-0.02em',
      color: 'var(--text-strong)'
    }
  }, t.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '20px 0 0',
      font: '400 16px/1.7 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, t.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-default)',
      margin: '26px 0'
    }
  }), /*#__PURE__*/React.createElement(MetaGrid, {
    items: items
  }), t.roles ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(MetaGrid, {
    columns: 1,
    items: [{
      label: 'Roles it prepares you for',
      value: t.roles
    }]
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "arrow-right",
    onClick: () => onNavigate('tracks')
  }, "Explore this track"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    onClick: () => onNavigate('guidance')
  }, "Still unsure? Talk to us")))));
}
function HowSection() {
  const {
    SectionHeader,
    CellGrid,
    StepCell,
    FeatureCell
  } = window.AI4ImpactDesignSystem_a75035;
  const steps = [['01', 'Choose', 'Pick a role, not a topic', 'Six tracks, each mapped to a job you can apply for. A free call helps you choose.'], ['02', 'Learn', 'Recorded lessons, weekly live help', 'Learn at your pace. Bring questions to the weekly clarification session.'], ['03', 'Build', 'Projects on realistic data', 'Three or four reviewed projects and a fintech-first capstone.'], ['04', 'Prove', 'Earn the professional certificate', 'Pass an independently reviewed capstone and defend it.'], ['05', 'Move', 'Optional Programme+', 'Internship, mock interviews and recruiter recommendations.']];
  const feats = [['circle-play', '01', 'Recorded lessons', 'Short, structured lessons you watch on your schedule.'], ['hammer', '02', 'Hands-on labs', 'Every week ends with something built, not just watched.'], ['messages-square', '03', 'Weekly live clarification', 'Bring blockers to a live session with your trainer.'], ['calendar-clock', '04', 'Assessed projects', 'Reviewed against a rubric, then rolled into your portfolio.']];
  return /*#__PURE__*/React.createElement(Section, {
    id: "how",
    tone: "alt"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "How AI4Impact works",
    title: "From choosing a role to doing it.",
    lead: "Structured learning, real projects, personal guidance and career acceleration, in that order."
  }), /*#__PURE__*/React.createElement(CellGrid, {
    columns: 5,
    style: {
      marginTop: 48
    }
  }, steps.map(s => /*#__PURE__*/React.createElement(StepCell, {
    key: s[0],
    number: s[0],
    title: s[1],
    subtitle: s[2],
    description: s[3]
  }))));
}
function ProjectsSection() {
  const {
    SectionHeader,
    ProjectCard,
    Chip
  } = window.AI4ImpactDesignSystem_a75035;
  const k = s => /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--teal-400)'
    }
  }, s);
  const a = /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-on-dark-muted)'
    }
  }, "\u2192");
  const tile = (l, v) => /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-dark-strong)',
      borderRadius: 4,
      padding: '7px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, l), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      font: '600 13px/1 var(--font-body)',
      color: 'var(--text-on-dark)'
    }
  }, v));
  const bars = [24, 36, 30, 46, 40, 54, 48, 58, 52, 60];
  const p = [['Forward Deployed AI Engineer', 'POST /v1/score', /*#__PURE__*/React.createElement("div", null, '{', /*#__PURE__*/React.createElement("br", null), "\xA0\xA0", k('"transaction_id"'), ": \"txn_8816\",", /*#__PURE__*/React.createElement("br", null), "\xA0\xA0", k('"score"'), ": ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--amber-500)'
    }
  }, "0.87"), ",", /*#__PURE__*/React.createElement("br", null), "\xA0\xA0", k('"decision"'), ": \"review\",", /*#__PURE__*/React.createElement("br", null), "\xA0\xA0", k('"latency_ms"'), ": 41", /*#__PURE__*/React.createElement("br", null), '}'), 'Merchant settlements API', 'A production-style API that exposes daily merchant settlements with auth, pagination and audit logs.', 'Synthetic merchant transactions and settlement batches', ['OpenAPI spec', 'Test suite', 'Deployed endpoint']], ['Data & AI Platform Engineer', 'dags/transactions_daily.py', /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    variant: "code"
  }, "extract"), a, /*#__PURE__*/React.createElement(Chip, {
    variant: "code"
  }, "validate"), a, /*#__PURE__*/React.createElement(Chip, {
    variant: "code"
  }, "load"), a, /*#__PURE__*/React.createElement(Chip, {
    variant: "code"
  }, "dbt run"), a, /*#__PURE__*/React.createElement(Chip, {
    variant: "code-amber"
  }, "test")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, "rows_loaded=1,284,512 \xB7 null_rate=0.02% \xB7 sla=met")), 'Fintech transaction pipeline', 'Incremental ingestion of card transactions into a tested, documented warehouse.', 'Card transactions, merchants and FX rates', ['DAG', 'dbt docs', 'Quality report']], ['Data Science, Analytics & Decision Intelligence', 'Payments Conversion · Power BI', /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 6
    }
  }, tile('Auth rate', '94.1%'), tile('Failed', '3.2%'), tile('Drop-off', '12%')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-end',
      height: 60,
      marginTop: 14
    }
  }, bars.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: h,
      borderRadius: 4,
      background: i === bars.length - 1 ? 'var(--amber-500)' : 'var(--teal-500)',
      opacity: i === bars.length - 1 ? 1 : .85
    }
  })))), 'Payments conversion dashboard', 'A dashboard tracking authorisation rates, failure reasons and conversion by method and bank.', 'Checkout sessions and payment attempts', ['Dashboard', 'KPI dictionary', 'Insight summary']]];
  return /*#__PURE__*/React.createElement(Section, {
    id: "projects"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "What you build",
    title: "Projects that look like the job.",
    lead: "Pipelines, dashboards, models and agents built on realistic fintech data, then reviewed against a rubric."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 20,
      marginTop: 48
    }
  }, p.map(x => /*#__PURE__*/React.createElement("div", {
    key: x[0],
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 14px/1.3 var(--font-body)',
      color: 'var(--text-body)'
    }
  }, x[0]), /*#__PURE__*/React.createElement(ProjectCard, {
    theme: "light",
    title: x[3],
    description: x[4],
    tags: x[6],
    style: {
      flex: 1
    }
  })))));
}
function CertSection() {
  const {
    SectionHeader,
    Button,
    Certificate,
    CheckCard
  } = window.AI4ImpactDesignSystem_a75035;
  return /*#__PURE__*/React.createElement(Section, {
    id: "cert",
    tone: "alt"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.05fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Certification",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Earn proof of what", /*#__PURE__*/React.createElement("br", null), "you can actually build."),
    lead: "Professional certificates are issued by the AI4Impact Institute of Applied AI (IIAA) and can be verified by any employer."
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "arrow-right",
    style: {
      marginTop: 28
    }
  }, "Explore certification standards")), /*#__PURE__*/React.createElement(Certificate, null)), false && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      marginTop: 48
    }
  }, /*#__PURE__*/React.createElement(CheckCard, {
    eyebrow: "What you get by finishing",
    title: "Course completion",
    subtitle: "You watched the lessons and submitted the work.",
    items: ['90%+ of lessons completed', 'All weekly assignments submitted', 'Quizzes attempted'],
    footer: "Record of completion in your learner profile"
  }), /*#__PURE__*/React.createElement(CheckCard, {
    highlighted: true,
    eyebrow: "What employers can verify",
    title: "Professional certificate",
    subtitle: "You proved you can do the work, under assessment.",
    items: ['Overall assessed score of 70% or more', 'Capstone passed by an independent reviewer', 'Capstone defence: a recorded walkthrough and Q&A'],
    footer: "Verifiable certificate with credential ID and QR code"
  })));
}
function ProgrammeSection() {
  const {
    SectionHeader,
    Chip,
    Icon,
    Button,
    CellGrid,
    ModuleCell
  } = window.AI4ImpactDesignSystem_a75035;
  const steps = ['Learn', 'Build', 'Intern', 'Practise', 'Apply', 'Interview'];
  return /*#__PURE__*/React.createElement(Section, {
    id: "programme",
    tone: "alt"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.1fr',
      gap: 56,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrowTone: "promo",
    eyebrow: "Optional career layer",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Programme+. One", /*#__PURE__*/React.createElement("br", null), "bundle for the", /*#__PURE__*/React.createElement("br", null), "move into the role."),
    lead: /*#__PURE__*/React.createElement(React.Fragment, null, "Add it to any track. Five modules that take you from a finished capstone to real interviews, for ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-strong)'
      }
    }, "\u20B924,999"), ".")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 8px',
      alignItems: 'center',
      marginTop: 24,
      maxWidth: 440
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s
  }, /*#__PURE__*/React.createElement(Chip, null, s), i < steps.length - 1 ? /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14,
    color: "var(--text-body)"
  }) : null))), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "arrow-right",
    style: {
      marginTop: 28
    }
  }, "See what Programme+ includes")), /*#__PURE__*/React.createElement(CellGrid, {
    columns: 2
  }, /*#__PURE__*/React.createElement(ModuleCell, {
    style: {
      gridColumn: 'span 2'
    },
    number: "01",
    title: "Real-World Internship",
    description: "3 months on a live project, with mentor reviews.",
    note: "Freshers and recent graduates only. Subject to eligibility and project availability."
  }), /*#__PURE__*/React.createElement(ModuleCell, {
    number: "02",
    title: "Interview Builder",
    description: "CV review, 10 AI-assisted mock interviews and a plan to improve."
  }), /*#__PURE__*/React.createElement(ModuleCell, {
    number: "03",
    title: "Recruitment Support",
    description: "Recommendations through 10+ recruitment and consultancy relationships."
  }), /*#__PURE__*/React.createElement(ModuleCell, {
    number: "04",
    title: "Weekly Group Clarification",
    description: "A recurring live session every week for questions and reviews."
  }), /*#__PURE__*/React.createElement(ModuleCell, {
    number: "05",
    title: "Personal Handholding",
    description: "Five individual 30-minute sessions, booked when you need them."
  }))));
}
function TrainersSection() {
  const {
    SectionHeader,
    TrainerCard,
    Button
  } = window.AI4ImpactDesignSystem_a75035;
  return /*#__PURE__*/React.createElement(Section, {
    id: "trainers"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Trainers",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Learn from people", /*#__PURE__*/React.createElement("br", null), "who do this work.")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 16,
      marginTop: 44
    }
  }, AI4.trainers.map(t => /*#__PURE__*/React.createElement(TrainerCard, {
    key: t[0],
    name: t[0],
    initials: t[1],
    subtitle: t[3]
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    style: {
      marginTop: 24
    }
  }, "Meet all trainers"));
}
function HomeScreen({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Home"
  }, /*#__PURE__*/React.createElement(HomeHero, {
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement(TracksSection, {
    onNavigate: onNavigate,
    onExplore: () => onNavigate('tracks')
  }), /*#__PURE__*/React.createElement(HowSection, null), /*#__PURE__*/React.createElement(ProjectsSection, null), /*#__PURE__*/React.createElement(CertSection, null), /*#__PURE__*/React.createElement(GuidanceSection, null));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeSections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Shared.jsx
try { (() => {
const DS = window.AI4ImpactDesignSystem_a75035;
function Section({
  id,
  tone = 'page',
  children,
  pad = 112
}) {
  const bg = {
    page: 'var(--surface-page)',
    alt: 'var(--surface-alt)',
    dark: 'var(--bg-hero)'
  }[tone];
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    style: {
      background: bg,
      padding: pad + 'px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container)',
      margin: '0 auto',
      padding: '0 var(--container-pad)'
    }
  }, children));
}
function TrackGrid({
  tracks,
  onExplore
}) {
  const {
    TrackCard
  } = DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: 16
    }
  }, tracks.map(t => /*#__PURE__*/React.createElement(TrackCard, {
    key: t.id,
    number: t.n,
    family: t.fam,
    badge: t.badge,
    title: t.title,
    description: t.desc,
    meta: AI4.meta(t),
    onExplore: () => onExplore && onExplore(t),
    onEnrol: () => onExplore && onExplore(t)
  })));
}
function CompareSection() {
  const {
    SectionHeader,
    CompareTable
  } = DS;
  return /*#__PURE__*/React.createElement(Section, {
    id: "compare",
    tone: "alt",
    pad: 96
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Compare",
    title: "All tracks at a glance.",
    size: "sm"
  }), /*#__PURE__*/React.createElement(CompareTable, {
    style: {
      marginTop: 36
    },
    columns: AI4.compareCols,
    rows: AI4.compareRows
  }));
}
function GuidanceSection() {
  const {
    Eyebrow,
    Input,
    Select,
    Checkbox,
    Button
  } = DS;
  const [sent, setSent] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  return /*#__PURE__*/React.createElement(Section, {
    id: "guidance",
    tone: "dark",
    pad: 104
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 80,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "promo",
    line: false
  }, "Free career guidance"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '20px 0 0',
      font: '700 44px/1.04 var(--font-display)',
      letterSpacing: '-0.03em',
      color: 'var(--text-on-dark)'
    }
  }, "Not sure which", /*#__PURE__*/React.createElement("br", null), "role fits you?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '22px 0 0',
      maxWidth: 500,
      font: '400 17px/1.7 var(--font-body)',
      color: 'var(--text-on-dark-body)'
    }
  }, "Book a free 20-minute call. We look at your background and tell you honestly which track fits, or if none of them do yet.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark-raised)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-3xl)',
      padding: '30px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 22px/1.2 var(--font-display)',
      color: 'var(--text-on-dark)'
    }
  }, "Request received."), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '400 15px/1.6 var(--font-body)',
      color: 'var(--text-on-dark-body)'
    }
  }, "We'll be in touch to schedule your call.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Input, {
    label: "Full name"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Phone / WhatsApp",
    defaultValue: "+91"
  })), /*#__PURE__*/React.createElement(Select, {
    label: "I'm interested in",
    options: ['Not sure yet — help me choose'].concat(AI4.tracks.map(t => t.title))
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: ok,
    onChange: setOk
  }, "I agree to be contacted by AI4Impact via call, SMS, email and WhatsApp about courses and services. My data is handled in line with the DPDP Act 2023."), /*#__PURE__*/React.createElement(Button, {
    variant: "light",
    size: "md",
    fullWidth: true,
    disabled: !ok,
    onClick: () => setSent(true)
  }, "Book free career guidance")))));
}
function SiteFooter() {
  const {
    Footer
  } = DS;
  return /*#__PURE__*/React.createElement(Footer, {
    basePath: "../../",
    columns: AI4.footerCols,
    note: "Issued by the AI4Impact Institute of Applied AI (IIAA) in academic collaboration with XYZ University. Final wording is subject to the approved collaboration language.",
    legal: "\xA9 2026 AI4Impact. Professional certificates are not academic degrees. Career support does not guarantee employment.",
    legalRight: "Learner data is handled in line with the DPDP Act 2023."
  });
}
Object.assign(window, {
  Section,
  TrackGrid,
  CompareSection,
  GuidanceSection,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Shared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.jsx
try { (() => {
const AI4 = {};
AI4.tracks = [{
  id: 'fde',
  n: '01',
  fam: 'Build',
  title: 'Forward Deployed AI Engineer',
  badge: 'Flagship',
  desc: 'Own an AI solution end to end — from client discovery to a deployed, monitored system.',
  level: 'Advanced',
  dur: '12–24 weeks',
  weekly: '8–10 hrs',
  proj: '4 incl. capstone',
  projN: '4',
  fee: '₹69,999',
  need: 'Programming fundamentals in any language',
  roles: 'Forward Deployed Engineer · Applied AI Engineer · AI Solutions Engineer'
}, {
  id: 'dp',
  n: '02',
  fam: 'Data',
  title: 'Data & AI Platform Engineer',
  desc: 'Build reliable batch and streaming platforms that feed analytics and AI workloads.',
  level: 'Intermediate',
  dur: '12–16 weeks',
  weekly: '8–10 hrs',
  proj: '4 incl. capstone',
  projN: '4',
  fee: '₹49,999'
}, {
  id: 'ds',
  n: '03',
  fam: 'Data',
  title: 'Data Science, Analytics & Decision Intelligence',
  desc: 'Turn messy business data into analysis, models and recommendations leaders act on.',
  level: 'Beginner–Intermediate',
  dur: '10–12 weeks',
  weekly: '8–10 hrs',
  proj: '5 incl. capstone',
  projN: '5',
  fee: '₹39,999'
}, {
  id: 'ml',
  n: '04',
  fam: 'Build',
  title: 'Applied AI & Machine Learning Engineer',
  desc: 'Train, deploy and monitor ML models as reliable services, not notebook experiments.',
  level: 'Intermediate',
  dur: '12–16 weeks',
  weekly: '8–10 hrs',
  proj: '4 incl. capstone',
  projN: '4',
  fee: '₹49,999'
}, {
  id: 'gen',
  n: '05',
  fam: 'Build',
  title: 'Generative AI & Agentic Systems Engineer',
  desc: 'Build retrieval, tool-using agents and evaluation pipelines that hold up in production.',
  level: 'Intermediate–Advanced',
  dur: '10–12 weeks',
  weekly: '8–10 hrs',
  proj: '4 incl. capstone',
  projN: '4',
  fee: '₹44,999'
}, {
  id: 'prod',
  n: '06',
  fam: 'Product',
  title: 'AI Product & Automation Builder',
  desc: 'Find AI opportunities, write the PRD, prototype and launch workflows people adopt.',
  level: 'All Levels',
  dur: '8–10 weeks',
  weekly: '8–10 hrs',
  proj: '4 incl. capstone',
  projN: '4',
  fee: '₹34,999'
}];
AI4.meta = t => [{
  label: 'Level',
  value: t.level
}, {
  label: 'Duration',
  value: t.dur
}, {
  label: 'Weekly',
  value: t.weekly
}, {
  label: 'Projects',
  value: t.proj
}];
AI4.finder = [['Ship AI into real businesses', 'fde'], ['Build data platforms and pipelines', 'dp'], ['Turn data into decisions', 'ds'], ['Train and deploy ML models', 'ml'], ['Build LLM apps and agents', 'gen'], ['Lead AI products and automation', 'prod']];
AI4.links = [{
  id: 'tracks',
  label: 'Career tracks'
}, {
  id: 'how',
  label: 'How it works'
}, {
  id: 'projects',
  label: 'Projects'
}, {
  id: 'cert',
  label: 'Certification'
}];
AI4.announce = ['Free webinar this Sunday · Sun, 11 Oct, 11:00 AM – 1:00 PM IST', 'Data & GenAI Career Masterclass', 'Worth ₹4,999 — now FREE', 'Live with Puneet Nischal & team'];
AI4.trainers = [['Bhaskar M', 'BM', 'teal', 'Azure data engineering, Databricks and lakehouse design'], ['Kamal K Naidu', 'KN', 'navy', 'Analytics, SQL, KPIs and business storytelling'], ['Shuja L P', 'SL', 'amber', 'Data visualisation, storytelling and dashboards'], ['Naveen G', 'NG', 'teal', 'Statistics, machine learning and model evaluation'], ['Puneet Nischal', 'PN', 'navy', 'LLM applications, RAG and agentic systems'], ['Ritesh', 'R', 'amber', 'Product discovery, PRDs, metrics and launches']];
AI4.footerCols = [{
  title: 'Career tracks',
  links: AI4.tracks.map(t => t.title)
}, {
  title: 'Programme',
  links: ['Programme+', 'Certification', 'Verify a certificate', 'Trainers']
}, {
  title: 'For employers',
  links: ['Hire from us', 'Become a partner consultancy']
}];
AI4.compareCols = [{
  key: 'title',
  label: 'Track'
}, {
  key: 'fam',
  label: 'Family',
  muted: true
}, {
  key: 'level',
  label: 'Level'
}, {
  key: 'dur',
  label: 'Duration'
}, {
  key: 'weeklyW',
  label: 'Weekly effort'
}, {
  key: 'projN',
  label: 'Projects'
}, {
  key: 'fee',
  label: 'Fee',
  align: 'right'
}];
AI4.compareRows = AI4.tracks.map(t => ({
  ...t,
  weeklyW: t.weekly + '/week'
}));
window.AI4 = AI4;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CellGrid = __ds_scope.CellGrid;

__ds_ns.Certificate = __ds_scope.Certificate;

__ds_ns.CheckCard = __ds_scope.CheckCard;

__ds_ns.CodeWindow = __ds_scope.CodeWindow;

__ds_ns.FeatureCell = __ds_scope.FeatureCell;

__ds_ns.ModuleCell = __ds_scope.ModuleCell;

__ds_ns.ProjectCard = __ds_scope.ProjectCard;

__ds_ns.StepCell = __ds_scope.StepCell;

__ds_ns.TrackCard = __ds_scope.TrackCard;

__ds_ns.TrainerCard = __ds_scope.TrainerCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.CompareTable = __ds_scope.CompareTable;

__ds_ns.MetaGrid = __ds_scope.MetaGrid;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.ChoiceOption = __ds_scope.ChoiceOption;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.AnnouncementBar = __ds_scope.AnnouncementBar;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

})();
