// Una ilustración vectorial propia por cada hito de la línea de tiempo (clave = id del hito).
// Se dibujan sobre el mismo fondo que TimelineArt (viewBox 320×200), son locales y no requieren
// imágenes ni servicios externos. Son representativas: no reproducen obras ni fotografías reales.

const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
const point = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

const milpa = <>
  <path d="M0 160Q80 146 160 158T320 152V200H0Z" fill="#8a6a45" opacity=".45"/>
  {[72, 158, 244].map((x, i) => <g key={x}>
    <path d={`M${x} 168V68`} stroke="#6f8d4e" strokeWidth="4.5" strokeLinecap="round"/>
    <path d={`M${x} 150Q${x - 40} 134 ${x - 54} 152Q${x - 22} 148 ${x} 158Z M${x} 126Q${x + 40} 110 ${x + 54} 128Q${x + 22} 124 ${x} 134Z M${x} 102Q${x - 36} 88 ${x - 48} 104Q${x - 20} 102 ${x} 110Z`} fill="#6f9650"/>
    <path d={`M${x} 68Q${x - 6} 52 ${x - 14} 48M${x} 68Q${x} 50 ${x} 44M${x} 68Q${x + 7} 52 ${x + 14} 48`} stroke="#c9a85a" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <g transform={`rotate(${i === 1 ? -12 : 12} ${x + 10} 112)`}><ellipse cx={x + 10} cy="108" rx="8" ry="19" fill="#d2a34a"/>{[0, 1, 2, 3].map(k => <circle key={k} cx={x + 7 + (k % 2) * 6} cy={96 + k * 7} r="2.2" fill="#f4d37c"/>)}<path d={`M${x + 1} 126Q${x + 4} 100 ${x + 10} 90Q${x + 18} 102 ${x + 20} 126Z`} fill="#7f9a55"/></g>
  </g>)}
  <path d="M120 130Q108 112 122 100Q134 114 128 132M176 132Q188 116 176 104" stroke="#4e7a45" strokeWidth="2" fill="none"/>
  <g fill="#6a9a4a"><ellipse cx="121" cy="112" rx="3.6" ry="8" transform="rotate(-20 121 112)"/><ellipse cx="180" cy="116" rx="3.6" ry="8" transform="rotate(25 180 116)"/></g>
  <g><ellipse cx="116" cy="176" rx="26" ry="14" fill="#d9873a"/><path d="M100 176Q116 164 132 176M96 172Q116 192 136 172" stroke="#a85f1f" strokeWidth="2" fill="none"/><path d="M130 164Q146 154 158 160" stroke="#5f7e3f" strokeWidth="3" fill="none"/></g>
  <g fill="#9a3b2d"><path d="M196 176Q208 160 224 170Q214 186 196 176Z"/><path d="M222 172l8-8" stroke="#54724e" strokeWidth="3"/></g>
  <ellipse cx="262" cy="178" rx="9" ry="6" fill="#7f3130"/>
</>;

const metateComal = <>
  <path d="M38 152L148 126L168 146L58 174Z" fill="#6f675d"/><path d="M38 152L148 126L158 136L50 162Z" fill="#9a9186"/>
  <path d="M60 170v12M144 144v14M162 148v12" stroke="#5c554d" strokeWidth="8" strokeLinecap="round"/>
  <path d="M62 142L140 120" stroke="#5f584f" strokeWidth="15" strokeLinecap="round"/><path d="M62 139L140 117" stroke="#857d72" strokeWidth="6" strokeLinecap="round"/>
  <path d="M42 168q8-8 16 0q-8 6-16 0Z" fill="#f0dbb2"/>
  {[[34, 184], [46, 188], [58, 186], [24, 180]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.4" fill="#e6b94d"/>)}
  <ellipse cx="236" cy="152" rx="68" ry="16" fill="#26262b"/><ellipse cx="236" cy="148" rx="62" ry="13" fill="#3d3d44"/>
  {[[210, 146], [244, 142], [262, 152]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="22" ry="7" fill="#f0d89a" stroke="#d3b46a"/><ellipse cx={x - 6} cy={y} rx="3" ry="1.6" fill="#c08b3e" opacity=".7"/><ellipse cx={x + 8} cy={y + 1} rx="2.6" ry="1.4" fill="#c08b3e" opacity=".7"/></g>)}
  <path d="M206 128Q196 112 208 98M240 124Q252 108 240 92M264 132Q272 120 264 108" stroke="#b6a491" strokeWidth="3" fill="none" strokeLinecap="round"/>
  <g fill="#e0752a"><path d="M196 172q6-18 12-2q4-14 10 0q6-16 12 0q6-12 12 0q4-10 10 2v12H196Z"/></g><g fill="#f4c04a"><path d="M210 182q4-10 8 0Zm22 0q4-12 8 0Z"/></g>
</>;

const encuentros1519 = <>
  <path d="M0 140L44 80L62 98L86 66L122 140Z" fill="#9aa8b0" opacity=".75"/><path d="M86 66L74 84l12-4 8 8Z" fill="#fffdf6"/>
  <path d="M0 150Q40 138 80 150T160 150T240 150T320 150V200H0Z" fill="#3d6f86" opacity=".8"/>
  <path d="M0 168Q40 156 80 168T160 168T240 168T320 168V200H0Z" fill="#2c586d" opacity=".9"/>
  <path d="M92 134Q160 170 236 132L226 118H106Z" fill="#7a4a2c"/><path d="M106 118H226" stroke="#c99a5a" strokeWidth="3"/><path d="M118 136Q160 150 214 134" stroke="#a8764b" strokeWidth="2" fill="none"/>
  <path d="M132 118V52M168 118V36M204 118V62" stroke="#3e2b1d" strokeWidth="3.5"/>
  <path d="M118 56Q132 66 146 56V104Q132 114 118 104Z" fill="#f6ecd2" stroke="#b9a98a"/><path d="M152 40Q168 50 184 40V100Q168 110 152 100Z" fill="#f6ecd2" stroke="#b9a98a"/><path d="M190 66Q204 74 218 66V104Q204 112 190 104Z" fill="#f6ecd2" stroke="#b9a98a"/>
  <path d="M118 82H146M152 70H184" stroke="#a83e44" strokeWidth="5"/>
  <path d="M168 36l24 5-24 6Z" fill="#a83e44"/>
  <g fill="none" stroke="#ffffff" strokeWidth="2" opacity=".55" strokeLinecap="round"><path d="M40 158q10-6 20 0M250 160q10-6 20 0M270 176q10-6 20 0M24 180q10-6 20 0"/></g>
</>;

const fundacionPuebla = <>
  <path d="M118 104q42-62 84 0Z" fill="#a05b3c"/><path d="M155 62v-14M147 54h16" stroke="#7a4a2c" strokeWidth="3"/><rect x="152" y="66" width="16" height="10" rx="3" fill="#e9d9b0"/>
  <rect x="112" y="98" width="96" height="54" fill="#c9b08e"/>
  <rect x="86" y="64" width="32" height="88" fill="#b79a74"/><rect x="202" y="64" width="32" height="88" fill="#b79a74"/>
  <path d="M84 64q18-30 36 0ZM200 64q18-30 36 0Z" fill="#a05b3c"/><path d="M102 34v-10M96 28h12M218 34v-10M212 28h12" stroke="#7a4a2c" strokeWidth="2.5"/>
  <g fill="#4a3426"><path d="M96 90v-10q6-8 12 0v10ZM212 90v-10q6-8 12 0v10ZM96 120v-10q6-8 12 0v10ZM212 120v-10q6-8 12 0v10Z"/><path d="M146 152v-34q14-20 28 0v34Z"/></g>
  <circle cx="160" cy="100" r="9" fill="#f0e2bd" stroke="#8d7552" strokeWidth="2"/><path d="M160 91v18M151 100h18" stroke="#8d7552" strokeWidth="1.5"/>
  <path d="M112 152h96M104 144h112" stroke="#9c845f" strokeWidth="3"/>
  <ellipse cx="160" cy="176" rx="130" ry="20" fill="#d7c3a1"/><path d="M60 176h200M80 168h160M100 184h120" stroke="#bda57f" strokeWidth="1.5"/>
  <g fill="#a83e44"><path d="M44 176l12-10 12 10Z"/></g><g fill="#527fa4"><path d="M252 176l12-10 12 10Z"/></g>
  <path d="M44 176l-4 8M68 176l4 8M252 176l-4 8M276 176l4 8" stroke="#6b5a45" strokeWidth="2"/>
</>;

const ingredientesVirreinales = <>
  <path d="M206 60l8-14 6 14M214 46v-18" stroke="#6a5a48" strokeWidth="2" fill="none"/><path d="M186 66Q214 80 246 62L238 56H194Z" fill="#7a4a2c" opacity=".85"/><path d="M200 56V36l14 4v16M226 56V30l16 6v20" fill="#f1e6cf" stroke="#b9a98a" strokeWidth="1.5"/>
  <path d="M0 168Q80 154 160 164T320 158V200H0Z" fill="#8a6a45" opacity=".4"/>
  <path d="M32 178Q24 138 52 124Q58 112 72 124Q102 138 94 178Z" fill="#cdb48a"/><path d="M52 124Q62 130 72 124" stroke="#8a6f43" strokeWidth="3" fill="none"/><path d="M40 160Q64 168 88 160" stroke="#b89c6e" strokeWidth="2" fill="none"/>
  {[40, 54, 68, 82].map((x, i) => <g key={x}><path d={`M${x + 8} 128V${88 - (i % 2) * 8}`} stroke="#c99b3e" strokeWidth="2"/>{[0, 1, 2, 3, 4].map(k => <ellipse key={k} cx={x + 8 + (k % 2 ? 4 : -4)} cy={92 - (i % 2) * 8 + k * 7} rx="3" ry="5" fill="#e6b94d" transform={`rotate(${k % 2 ? 25 : -25} ${x + 8} ${92 - (i % 2) * 8 + k * 7})`}/>)}</g>)}
  <g stroke="#6f8d4e" strokeWidth="7" strokeLinecap="round"><path d="M132 178L150 72"/><path d="M148 178L172 78"/></g>
  <g stroke="#b6cf7a" strokeWidth="3"><path d="M138 142h8M142 118h8M146 96h8M153 150h8M158 124h8M163 100h8"/></g>
  <path d="M150 74Q130 62 112 70Q132 72 150 82ZM172 80Q190 66 206 72Q188 76 172 88Z" fill="#6f9650"/>
  <g transform="rotate(-18 214 166)">{[0, 1, 2].map(k => <g key={k}><rect x="190" y={150 + k * 11} width="52" height="9" rx="4.5" fill="#a0623a"/><ellipse cx="190" cy={154.5 + k * 11} rx="3" ry="4.5" fill="#6e3d20"/></g>)}</g>
  {[[252, 176], [264, 168], [274, 178], [284, 170], [258, 182]].map(([x, y], i) => <path key={i} d={`M${x} ${y}q-6-10 0-16q6 6 0 16Z`} fill="#d8b98a" stroke="#a88a5c" strokeWidth=".8" transform={`rotate(${i * 30 - 40} ${x} ${y})`}/>)}
  <path d="M290 184L298 154L312 184Z" fill="#8d4e30"/>
</>;

const barrocoConventual = <>
  <path d="M52 176V84q0-46 108-46t108 46v92Z" fill="#b59a79" opacity=".5"/><path d="M76 176V90q0-34 84-34t84 34v86Z" fill="#8f7658" opacity=".45"/>
  <g stroke="#2b5d9b" strokeWidth="2" fill="none" opacity=".8"><path d="M52 176V84q0-46 108-46t108 46v92"/><path d="M60 176V86q0-38 100-38t100 38v90"/></g>
  <path d="M110 38v22M210 38v22" stroke="#6a5a48" strokeWidth="2"/><path d="M98 60h24l-4 16H102ZM198 60h24l-4 16h-16Z" fill="#b8733f"/><path d="M104 76h12M204 76h12" stroke="#7a4a2c" strokeWidth="3"/>
  <rect x="48" y="150" width="224" height="12" rx="2" fill="#8a5735"/><path d="M62 162v22M258 162v22" stroke="#6e4326" strokeWidth="7"/>
  <path d="M84 130Q88 160 122 160T160 130Z" fill="#b66b3e"/><ellipse cx="122" cy="130" rx="38" ry="10" fill="#71412d"/><ellipse cx="122" cy="130" rx="30" ry="6.5" fill="#4a2a1c"/>
  {[[108, 129], [118, 131], [130, 128], [138, 131], [124, 126]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#f4ead2"/>)}
  <path d="M96 156q26 10 52 0" stroke="#d99666" strokeWidth="2.5" fill="none"/><path d="M108 110q-10-14 0-26M130 108q12-16 0-32" stroke="#b6a491" strokeWidth="3" fill="none" strokeLinecap="round"/>
  <ellipse cx="226" cy="152" rx="48" ry="9" fill="#cdb995"/><ellipse cx="226" cy="149" rx="44" ry="8" fill="#efe1bd"/>
  {[[196, 144, '#d97a8c'], [214, 140, '#7fa05a'], [234, 141, '#e6b94d'], [252, 145, '#9a5a3a'], [206, 152, '#e6b94d'], [226, 151, '#d97a8c'], [244, 152, '#7fa05a']].map(([x, y, c], i) => <g key={i}><rect x={x - 8} y={y - 7} width="16" height="11" rx="4" fill={c}/><rect x={x - 5} y={y - 6} width="7" height="3" rx="1.5" fill="#fff" opacity=".35"/></g>)}
</>;

const chilesNogada = <>
  <ellipse cx="160" cy="158" rx="124" ry="30" fill="#d3c7b3"/><ellipse cx="160" cy="150" rx="120" ry="30" fill="#fffaf0"/><ellipse cx="160" cy="150" rx="102" ry="22" fill="none" stroke="#2b5d9b" strokeWidth="1.5" opacity=".55"/>
  <path d="M64 146Q104 98 200 114Q252 124 268 148Q204 176 118 164Q76 158 64 146Z" fill="#3f6b3b"/><path d="M88 138Q124 112 196 124" stroke="#2f5230" strokeWidth="3" fill="none"/><path d="M64 146l-14-12" stroke="#2f5230" strokeWidth="5" strokeLinecap="round"/>
  <path d="M90 140Q136 106 214 124Q248 132 258 148Q198 168 128 158Q98 154 90 140Z" fill="#f7f0de"/><path d="M110 138Q150 118 206 130" stroke="#e5d9bc" strokeWidth="3" fill="none" strokeLinecap="round"/>
  {[[118, 142], [134, 132], [150, 148], [166, 130], [180, 144], [196, 134], [210, 148], [228, 142], [158, 138], [188, 152], [128, 150], [220, 134], [142, 124], [172, 154], [204, 126]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={i % 3 ? '#b0262f' : '#c93a3f'}/>)}
  {[[162, 126, -20], [176, 136, 30], [150, 138, 70], [190, 128, -50]].map(([x, y, r], i) => <path key={i} d={`M${x} ${y}q5-9 10 0q-5 7-10 0Z`} fill="#4f8a3a" transform={`rotate(${r} ${x} ${y})`}/>)}
  <path d="M270 128q-12-12 0-22q14 8 0 22Z" fill="#b0262f"/><path d="M270 128q8-10 0-22" stroke="#7d151c" strokeWidth="1.5" fill="none"/>
</>;

const panaderiaXix = <>
  <path d="M22 166V112q0-52 74-52t74 52v54Z" fill="#a8583a"/>
  <g stroke="#8e4529" strokeWidth="2" opacity=".75"><path d="M30 92h132M26 112h140M24 132h144M24 152h146"/><path d="M52 92v20M92 92v20M132 92v20M72 112v20M112 112v20M148 112v20M52 132v20M92 132v20M132 132v20"/></g>
  <path d="M62 166v-34q34-40 68 0v34Z" fill="#241811"/><path d="M76 166v-26q20-26 40 0v26Z" fill="#e0752a"/><path d="M88 166v-16q8-12 16 0v16Z" fill="#f4c04a"/>
  <rect x="124" y="30" width="22" height="34" fill="#8e4529"/><path d="M130 24q-8-10 0-18M140 22q8-10 0-20" stroke="#b6a491" strokeWidth="3" fill="none" strokeLinecap="round"/>
  <path d="M176 176L206 76" stroke="#8a5735" strokeWidth="5" strokeLinecap="round"/><ellipse cx="210" cy="64" rx="15" ry="10" fill="#a8764b" transform="rotate(-16 210 64)"/>
  <ellipse cx="248" cy="146" rx="40" ry="24" fill="#c98a3a"/><ellipse cx="248" cy="138" rx="38" ry="19" fill="#e0a850"/><ellipse cx="238" cy="132" rx="18" ry="6" fill="#f2c883" opacity=".6"/>
  {[[232, 132], [244, 128], [256, 134], [266, 140], [240, 140], [254, 144], [226, 142]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2.2" ry="1.2" fill="#fff0cf" transform={`rotate(${i * 25} ${x} ${y})`}/>)}
  <g transform="rotate(-8 290 176)"><rect x="236" y="168" width="82" height="20" rx="10" fill="#d99a48"/><path d="M252 170l8 16M270 170l8 16M288 170l8 16" stroke="#a96d2c" strokeWidth="2.5"/></g>
  <ellipse cx="288" cy="150" rx="22" ry="15" fill="#d3913f"/><ellipse cx="288" cy="145" rx="20" ry="12" fill="#e6b060"/>
</>;

const tacosArabes = <>
  <path d="M90 36V176" stroke="#6b6b72" strokeWidth="4"/><path d="M70 176h40" stroke="#54545b" strokeWidth="6" strokeLinecap="round"/><path d="M82 34h16" stroke="#6b6b72" strokeWidth="4"/>
  <path d="M66 62Q90 50 114 62L104 152H76Z" fill="#b9703f"/>
  <g stroke="#8d4e30" strokeWidth="3" strokeLinecap="round"><path d="M70 78Q90 84 110 78M72 96Q90 102 108 96M74 114Q90 120 106 114M76 132Q90 138 104 132"/></g>
  <g stroke="#e0a05a" strokeWidth="2" opacity=".7" strokeLinecap="round"><path d="M74 70q16 6 32 0M76 88q14 5 28 0M77 106q13 5 26 0M79 124q11 5 22 0"/></g>
  <rect x="122" y="70" width="12" height="86" rx="3" fill="#2b2b30"/><g fill="#e0752a"><rect x="125" y="74" width="6" height="78" rx="2"/></g><g fill="#f4c04a"><rect x="127" y="84" width="2.4" height="52" rx="1"/></g>
  <path d="M72 70q-8-12 2-24M108 68q10-14 0-28" stroke="#b6a491" strokeWidth="3" fill="none" strokeLinecap="round"/>
  <ellipse cx="232" cy="168" rx="82" ry="17" fill="#d9cdb8"/><ellipse cx="232" cy="163" rx="78" ry="16" fill="#fffaf0"/>
  {[[196, 156], [236, 148], [276, 158]].map(([x, y], i) => <g key={i}><path d={`M${x - 28} ${y + 8}Q${x} ${y - 38} ${x + 28} ${y + 8}Z`} fill="#ecd7a2" stroke="#c9ab6c" strokeWidth="1.5"/><path d={`M${x - 18} ${y + 4}Q${x} ${y - 26} ${x + 18} ${y + 4}`} fill="none" stroke="#a65a30" strokeWidth="6" strokeLinecap="round"/><path d={`M${x - 8} ${y - 8}q8-5 16 0`} stroke="#e9e1f0" strokeWidth="3" fill="none" strokeLinecap="round"/><circle cx={x + 6} cy={y - 14} r="2.4" fill="#5c7841"/></g>)}
  <g><circle cx="150" cy="176" r="12" fill="#6e9a3c"/><circle cx="150" cy="176" r="8" fill="#b6d36a"/><path d="M150 176v-8M150 176l7 4M150 176l-7 4" stroke="#6e9a3c" strokeWidth="1.2"/></g>
</>;

const antojitosUrbanos = <>
  <path d="M50 60V160M270 60V160" stroke="#8e6745" strokeWidth="5"/>
  {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${40 + i * 30} 58h30l-3 28q-12 8-24 0Z`} fill={i % 2 ? '#f6ecd2' : '#c0432f'}/>)}
  <path d="M40 58h240" stroke="#d3b074" strokeWidth="4"/>
  <g>{['#d94f6a', '#e6b94d', '#4f8a3a', '#527fa4', '#d94f6a', '#e6b94d', '#4f8a3a', '#527fa4', '#d94f6a'].map((c, i) => <path key={i} d={`M${54 + i * 26} 90h18v16l-4-4-5 4-5-4-4 4Z`} fill={c} opacity=".9"/>)}</g>
  <path d="M44 120Q160 98 276 120" stroke="#6b5a45" strokeWidth="1.5" fill="none"/>{[70, 110, 160, 210, 250].map((x, i) => <circle key={i} cx={x} cy={113 + Math.abs(x - 160) * .05} r="3.2" fill="#f4c04a"/>)}
  <rect x="40" y="140" width="240" height="22" rx="3" fill="#8a5735"/><rect x="40" y="140" width="240" height="5" fill="#a8764b"/><path d="M52 162v22M268 162v22" stroke="#6e4326" strokeWidth="7"/>
  <ellipse cx="108" cy="140" rx="52" ry="8" fill="#d9cdb8"/><ellipse cx="108" cy="137" rx="48" ry="7" fill="#fffaf0"/>
  {[[80, 132], [108, 129], [136, 132]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="16" ry="5" fill="#e2b968"/><ellipse cx={x} cy={y - 1} rx="12" ry="3.4" fill="#5c7841"/><circle cx={x - 4} cy={y - 1.5} r="1.6" fill="#b0262f"/><circle cx={x + 4} cy={y - 1.5} r="1.6" fill="#f4ead2"/></g>)}
  <ellipse cx="224" cy="138" rx="46" ry="8" fill="#2b2b30"/><ellipse cx="224" cy="135" rx="42" ry="6.5" fill="#44444b"/>
  {[[200, 132, -12], [220, 130, 8], [240, 132, -6], [256, 134, 14]].map(([x, y, r], i) => <g key={i} transform={`rotate(${r} ${x} ${y})`}><path d={`M${x - 11} ${y}q11-9 22 0q-11 9-22 0Z`} fill="#c98a3a"/><path d={`M${x - 7} ${y - 1}q7-4 14 0`} stroke="#f0c070" strokeWidth="1.5" fill="none"/></g>)}
  <path d="M206 120q-6-10 0-18M232 118q6-10 0-20" stroke="#b6a491" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
</>;

const star = Array.from({ length: 16 }, (_, i) => point(polar(160, 100, i % 2 ? 44 : 66, -90 + i * 22.5))).join(' ');
const leaves = side => Array.from({ length: 7 }, (_, i) => {
  const a = side === 'l' ? 125 + i * 17.5 : 55 - i * 17.5;
  const [x, y] = polar(160, 100, 84, a);
  return <ellipse key={`${side}${i}`} cx={x} cy={y} rx="4.2" ry="10" fill={i % 2 ? '#6f9650' : '#5c8a45'} transform={`rotate(${a + 90} ${x} ${y})`}/>;
});
const unesco2010 = <>
  <circle cx="160" cy="100" r="74" fill="none" stroke="#8b9b62" strokeWidth="1.5" strokeDasharray="2 5" opacity=".7"/>
  {leaves('l')}{leaves('r')}
  <circle cx="160" cy="100" r="68" fill="#f6f1e4" stroke="#1f4a8a" strokeWidth="4"/>
  <polygon points={star} fill="#cfe0f3" stroke="#1f4a8a" strokeWidth="2.5" strokeLinejoin="round"/>
  <circle cx="160" cy="100" r="34" fill="#fffaf0" stroke="#1f4a8a" strokeWidth="2"/>
  {Array.from({ length: 8 }, (_, i) => { const [x, y] = polar(160, 100, 55, -90 + i * 45); return <circle key={i} cx={x} cy={y} r="3.6" fill="#a83e44"/>; })}
  <path d="M138 100Q142 126 160 126T182 100Z" fill="#b66b3e"/><ellipse cx="160" cy="100" rx="22" ry="6.5" fill="#71412d"/><ellipse cx="160" cy="100" rx="16" ry="4" fill="#4a2a1c"/>
  <path d="M150 90q-6-8 0-16M164 88q6-9 0-18" stroke="#b6a491" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <path d="M130 156l-16 30 22-6 8 14 10-34Z" fill="#a83e44"/><path d="M190 156l16 30-22-6-8 14-10-34Z" fill="#8f2f38"/>
  <circle cx="160" cy="164" r="10" fill="#e6b94d" stroke="#b98a22" strokeWidth="2"/>
</>;

const cocinaContemporanea = <>
  <path d="M52 86L156 98V176L52 164Z" fill="#fffaf0" stroke="#c9b79a" strokeWidth="2"/><path d="M156 98L260 86V164L156 176Z" fill="#fbf4e4" stroke="#c9b79a" strokeWidth="2"/><path d="M156 98V176" stroke="#b9a07a" strokeWidth="3"/>
  <g stroke="#cbbfae" strokeWidth="2" strokeLinecap="round"><path d="M68 112l74 8M68 126l74 8M68 140l74 8M68 154l50 5"/></g>
  <circle cx="206" cy="124" r="22" fill="#fffaf0" stroke="#c9b79a"/><path d="M190 128q16 14 32 0Z" fill="#b66b3e"/><ellipse cx="206" cy="128" rx="16" ry="4.5" fill="#71412d"/><path d="M200 118q-4-6 0-12M212 118q4-7 0-14" stroke="#b6a491" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <g stroke="#cbbfae" strokeWidth="2" strokeLinecap="round"><path d="M178 158l66-8M178 168l46-6"/></g>
  <g transform="rotate(32 244 66)"><rect x="236" y="26" width="9" height="60" rx="2" fill="#d2a34a"/><path d="M236 86h9l-4.5 11Z" fill="#e9d4a6"/><path d="M239 92h3l-1.5 5Z" fill="#3b2b20"/><rect x="236" y="26" width="9" height="8" rx="2" fill="#a83e44"/></g>
  <g><rect x="22" y="40" width="18" height="34" rx="9" fill="#6b7a86"/><path d="M22 58h18" stroke="#4e5b66" strokeWidth="2"/><path d="M16 66q15 22 30 0M31 82v18M20 100h22" stroke="#4e5b66" strokeWidth="3" fill="none" strokeLinecap="round"/></g>
  <g stroke="#527fa4" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".85"><path d="M48 50q6 7 0 14M56 44q10 13 0 26M64 38q14 19 0 38"/></g>
  <g><path d="M276 176q4-14 14-18q-2 12-14 18Z" fill="#6f9650"/><path d="M288 180q10-10 22-8q-6 10-22 8Z" fill="#8b9b62"/><circle cx="300" cy="150" r="6" fill="#c93a3f"/></g>
</>;

export const timelineScenes = {
  'milpa': milpa,
  'metate-comal': metateComal,
  'encuentros-1519': encuentros1519,
  'fundacion-puebla': fundacionPuebla,
  'ingredientes-virreinales': ingredientesVirreinales,
  'barroco-conventual': barrocoConventual,
  'chiles-nogada': chilesNogada,
  'panaderia-xix': panaderiaXix,
  'tacos-arabes': tacosArabes,
  'antojitos-urbanos': antojitosUrbanos,
  'unesco-2010': unesco2010,
  'cocina-contemporanea': cocinaContemporanea,
};
