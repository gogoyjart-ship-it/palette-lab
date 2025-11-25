import React, { useEffect, useMemo, useState } from "react";

/* ===================== Firebase ===================== */
import { initializeApp } from "firebase/app";
import {
  getFirestore, addDoc, collection, serverTimestamp,
  onSnapshot, query, orderBy, deleteDoc, doc
} from "firebase/firestore";

/* ▶▶ 본인 Firebase 콘솔의 구성값으로 교체하세요 */
const firebaseConfig = {
  apiKey: "AIzaSyBMTM7oMnr7QZxlr02bznXu7Jm2OZtuwtc",
  authDomain: "palette-lab-e60ce.firebaseapp.com",
  projectId: "palette-lab-e60ce",
  storageBucket: "palette-lab-e60ce.appspot.com",
  messagingSenderId: "568599514296",
  appId: "1:568599514296:web:40bf43c8f891cffcb4b84d"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===================== 앱 타이틀/스킴 ===================== */
const APP_TITLE = "(디자인)색채학 배색 실습 - 저동중학교 1학년 동료 장학";

const SCHEMES = [
  { key: "tone_on_tone", label: "톤온톤" },
  { key: "tone_in_tone", label: "톤인톤" },
  { key: "accent",       label: "엑센트" },    // 세퍼레이션 -> 엑센트
  { key: "repetition",   label: "레퍼티션" },
  { key: "emotional",    label: "감성배색" },
];

const SCHEME_DESCS = {
  tone_on_tone: "같은 색상(H)에서 명도/채도만 달리한 배색",
  tone_in_tone: "유사한 명도/채도 안에서 색상만 달리한 배색",
  accent:       "주된 톤 속에서 대비되는 색을 한두 개 넣어 강조(포인트)하기",
  repetition:   "색 또는 톤을 반복해 리듬감·통일감을 제시한 배색",
  emotional:    "교사가 제시한 주제와 가장 잘 어울리는 배색",
};

/* ===================== 팔레트(요청 리스트 그대로) ===================== */
const CUSTOM_PALETTE = [
  // 무채색계
  { name: "흑백", hex: "#1D1E23", cmyk: "93,89,83,52" },
  { name: "백색", hex: "#FFFFFF", cmyk: "0,0,0,0" },
  { name: "회색", hex: "#A4AAA7", cmyk: "38,27,31,0" },
  { name: "구색", hex: "#959EA2", cmyk: "45,32,32,0" },
  { name: "치색", hex: "#616264", cmyk: "72,64,62,4" },
  { name: "연지회색", hex: "#6F606E", cmyk: "55,58,40,20" },
  { name: "설백색", hex: "#DDE7E7", cmyk: "12,4,7,0" },
  { name: "유배색", hex: "#E7E6D2", cmyk: "9,5,18,0" },
  { name: "지배색", hex: "#E3DDCB", cmyk: "6,6,17,4" },
  { name: "소색", hex: "#D8C8B2", cmyk: "10,15,26,5" },

  // 적색계
  { name: "적색", hex: "#B82647", cmyk: "21,98,68,8" },
  { name: "홍색", hex: "#F15B5B", cmyk: "0,80,60,0" },
  { name: "적토색", hex: "#9F494C", cmyk: "29,80,64,17" },
  { name: "휴색", hex: "#683235", cmyk: "40,80,66,44" },
  { name: "갈색", hex: "#966147", cmyk: "31,61,73,21" },
  { name: "호박색", hex: "#BD7F41", cmyk: "21,51,84,8" },
  { name: "추향색", hex: "#C38866", cmyk: "19,48,61,6" },
  { name: "육색", hex: "#D77964", cmyk: "11,62,59,2" },
  { name: "주색", hex: "#CA5E59", cmyk: "15,75,62,4" },
  { name: "주홍색", hex: "#C23352", cmyk: "18,94,60,5" },
  { name: "담주색", hex: "#EA8474", cmyk: "4,59,50,0" },
  { name: "진홍색", hex: "#BF2F7B", cmyk: "20,94,17,4" },
  { name: "선홍색", hex: "#CE5A9E", cmyk: "16,79,2,0" },
  { name: "연지색", hex: "#BE577B", cmyk: "19,77,28,7" },
  { name: "훈색", hex: "#D97793", cmyk: "9,64,20,2" },
  { name: "진분홍색", hex: "#DB4E9C", cmyk: "9,84,0,0" },
  { name: "분홍색", hex: "#E2A6B4", cmyk: "7,39,14,1" },
  { name: "연분홍색", hex: "#E0709B", cmyk: "6,69,11,1" },
  { name: "장단색", hex: "#E16350", cmyk: "6,75,70,1" },
  { name: "석간주색", hex: "#8A4C44", cmyk: "30,71,65,30" },
  { name: "흑홍색", hex: "#8E6F80", cmyk: "40,54,31,15" },

  // 황색계
  { name: "황색", hex: "#F9D537", cmyk: "3,13,89,0" },
  { name: "유황색", hex: "#EBBC6B", cmyk: "6,25,67,1" },
  { name: "명황색", hex: "#FEE134", cmyk: "2,7,89,0" },
  { name: "담황색", hex: "#F5F0C5", cmyk: "4,2,27,0" },
  { name: "송화색", hex: "#F8E77F", cmyk: "4,4,62,0" },
  { name: "자황색", hex: "#F7B938", cmyk: "2,29,89,0" },
  { name: "행황색", hex: "#F1A55A", cmyk: "3,40,73,0" },
  { name: "두록색", hex: "#E5B98F", cmyk: "8,27,45,1" },
  { name: "적황색", hex: "#ED9149", cmyk: "4,51,80,0" },
  { name: "토황색", hex: "#C8852C", cmyk: "18,50,97,5" },
  { name: "지황색", hex: "#D6B038", cmyk: "14,26,91,3" },
  { name: "토색", hex: "#9A6B31", cmyk: "30,54,91,20" },
  { name: "치자색", hex: "#F6CF7A", cmyk: "3,18,61,0" },
  { name: "홍황색", hex: "#DDA28F", cmyk: "9,39,38,2" },
  { name: "자황색2", hex: "#BB9E8B", cmyk: "22,33,40,7" },

  // 청록색계
  { name: "청색", hex: "#0B6DB7", cmyk: "89,56,0,0" },
  { name: "벽색", hex: "#00B5E3", cmyk: "73,5,4,0" },
  { name: "천청색", hex: "#5AC6D0", cmyk: "59,0,20,0" },
  { name: "담청색", hex: "#00A6A9", cmyk: "96,4,40,0" },
  { name: "취람색", hex: "#5DC19B", cmyk: "62,0,51,0" },
  { name: "양람색", hex: "#6C71B5", cmyk: "64,58,0,0" },
  { name: "벽청색", hex: "#448CCB", cmyk: "72,36,0,0" },
  { name: "청현색", hex: "#006494", cmyk: "99,59,22,3" },
  { name: "감색", hex: "#026892", cmyk: "93,57,26,2" },
  { name: "남색", hex: "#6A5BA8", cmyk: "68,73,0,0" },
  { name: "연람색", hex: "#7963AB", cmyk: "60,69,0,0" },
  { name: "벽람색", hex: "#6979BB", cmyk: "64,52,0,0" },
  { name: "숙람색", hex: "#45436C", cmyk: "86,84,40,9" },
  { name: "군청색", hex: "#4F599F", cmyk: "80,73,6,0" },
  { name: "녹색", hex: "#417141", cmyk: "82,44,95,9" },
  { name: "명록색", hex: "#16AA52", cmyk: "81,5,94,0" },
  { name: "유록색", hex: "#6AB048", cmyk: "64,8,97,0" },
  { name: "유청색", hex: "#569A49", cmyk: "72,20,96,1" },
  { name: "연두색", hex: "#C0D84D", cmyk: "29,0,87,0" },
  { name: "춘유록색", hex: "#CBDD61", cmyk: "24,0,78,0" },
  { name: "청록색", hex: "#009770", cmyk: "97,15,74,0" },
  { name: "진초록색", hex: "#0A8D5E", cmyk: "87,26,82,1" },
  { name: "초록색", hex: "#1C9249", cmyk: "85,20,98,2" },
  { name: "흑록색", hex: "#2E674E", cmyk: "89,52,83,9" },
  { name: "비색", hex: "#72C6A5", cmyk: "55,0,45,0" },
  { name: "옥색", hex: "#9ED6C0", cmyk: "38,0,30,0" },
  { name: "삼청색", hex: "#5C6EB4", cmyk: "71,59,0,0" },
  { name: "뇌록색", hex: "#397664", cmyk: "74,27,59,6" },
  { name: "양록색", hex: "#31B675", cmyk: "74,0,74,0" },
  { name: "하염색", hex: "#245441", cmyk: "83,43,75,39" },
  { name: "흑청색", hex: "#1583AF", cmyk: "84,39,17,0" },
  { name: "청벽색", hex: "#18B4E9", cmyk: "69,8,0,0" },

  // 자색계
  { name: "자색", hex: "#6D1B43", cmyk: "41,95,45,40" },
  { name: "자주색", hex: "#89236A", cmyk: "40,96,18,20" },
  { name: "보라색", hex: "#9C4998", cmyk: "42,85,1,1" },
  { name: "홍람색", hex: "#733E7F", cmyk: "58,85,10,15" },
  { name: "포도색", hex: "#5D3462", cmyk: "70,90,35,20" },
  { name: "청자색", hex: "#403F95", cmyk: "90,90,1,1" },
  { name: "벽자색", hex: "#84A7D3", cmyk: "47,25,1,1" },
  { name: "회보라색", hex: "#B3A7CD", cmyk: "28,32,1,1" },
  { name: "담자색", hex: "#BEA3C9", cmyk: "23,36,1,1" },
  { name: "다자색", hex: "#47302E", cmyk: "75,86,85,35" },
  { name: "적자색", hex: "#BA4160", cmyk: "15,86,42,13" },
 // 👉 추가 색상
  { name: "남색(C100 M100 K60)", hex: "#000033", cmyk: "100,100,0,60" },
];

/* ===================== 팔레트 유틸 ===================== */
function useCustomPalette() {
  const [seed, setSeed] = useState(() => Date.now());
  const colors = useMemo(() => {
    const list = [...CUSTOM_PALETTE];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [seed]);
  return { colors, reshuffle: () => setSeed(Date.now()) };
}

/* ===================== 공용 컴포넌트 ===================== */
function Swatch({ color, onPick }) {
  return (
    <button
      className="w-6 h-6 rounded border border-black/10"
      style={{ background: color.hex }}
      onClick={() => onPick(color)}
      title={`${color.name} (CMYK: ${color.cmyk})`}
    />
  );
}

function Palette({ colors, fixedOnTablet, onPick }) {
  return (
    <div className={fixedOnTablet ? "md:fixed md:right-4 md:top-24 md:bottom-4 md:w-72 overflow-y-auto" : ""}>
      <div className="p-3 rounded-2xl border border-black/10 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">팔레트</h4>
          <span className="text-xs text-black/50">{colors.length} colors</span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {colors.map((c, i) => (
            <Swatch key={i} color={c} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemeBoard({ title, desc, schemeKey, value, selected, onSelect }) {
  return (
    <div className="p-3 rounded-2xl border border-black/10 bg-white">
      <div className="mb-2">
        <h4 className="font-semibold inline-block mr-2">{title}</h4>
        <span className="text-xs text-black/60">{desc}</span>
      </div>
      {/* 가로 1×5 고정 */}
      <div className="grid grid-cols-5 gap-2">
        {value.map((c, i) => (
          <div
            key={i}
            className={`h-12 rounded-xl border-2 cursor-pointer ${
              selected.schemeKey === schemeKey && selected.index === i ? "border-black" : "border-black/10"
            }`}
            style={{ background: c ? c.hex : "#fff" }}
            onClick={() => onSelect({ schemeKey, index: i })}
            title={c ? `${c.name} (CMYK: ${c.cmyk})` : "빈 칸"}
          />
        ))}
      </div>
    </div>
  );
}

/* ===================== 공통 유틸 ===================== */
function serializeSchemes(s) {
  const out = {};
  for (const sc of SCHEMES) {
    out[sc.key] = (s[sc.key] || []).map((c) => (c ? `${c.name} | ${c.hex} | CMYK(${c.cmyk})` : null));
  }
  return out;
}

async function saveSubmission(payload) {
  await addDoc(collection(db, "submissions"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

/* ===================== 라우팅 훅 (단일 선언!) ===================== */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash.replace(/^#/, "");
}

/* ===================== 학생용 ===================== */
function StudentView({ onGoAdmin }) {
  const { colors } = useCustomPalette();
  const [name, setName] = useState("");
  const [sid, setSid] = useState("");
  const [selected, setSelected] = useState({ schemeKey: SCHEMES[0].key, index: 0 });
  const [schemes, setSchemes] = useState(() => {
    const init = {};
    for (const s of SCHEMES) init[s.key] = Array(5).fill(undefined);
    return init;
  });

  const handlePickColor = (color) => {
    if (!selected) return;
    setSchemes((prev) => {
      const next = { ...prev };
      const arr = [...next[selected.schemeKey]];
      arr[selected.index] = color;
      next[selected.schemeKey] = arr;
      return next;
    });
  };

  const onSubmit = async () => {
    if (!name.trim() || !sid.trim()) {
      alert("이름과 학번을 입력하세요.");
      return;
    }
    await saveSubmission({
      name: name.trim(),
      studentId: sid.trim(),
      data: serializeSchemes(schemes),
      pageTitle: APP_TITLE,
      userAgent: navigator.userAgent,
    });
    alert("제출 완료! (교사용 페이지에서 확인 가능)");
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[1fr_18rem] gap-4">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl border border-black/10 shadow-sm bg-white flex flex-wrap gap-3 items-center">
          <input
            className="px-3 py-2 rounded-lg border border-black/10 bg-white"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg border border-black/10 bg-white"
            placeholder="학번"
            value={sid}
            onChange={(e) => setSid(e.target.value)}
          />
          <button onClick={onSubmit} className="px-4 py-2 rounded-xl bg-black text-white shadow">
            제출하기
          </button>
          <button onClick={onGoAdmin} className="ml-auto text-sm underline text-black/70">
            교사용 페이지로 이동
          </button>
        </div>

        <div className="grid gap-4">
          {SCHEMES.map((s) => (
            <SchemeBoard
              key={s.key}
              title={s.label}
              desc={SCHEME_DESCS[s.key]}
              schemeKey={s.key}
              value={schemes[s.key]}
              selected={selected}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* 팔레트 (태블릿 이상 오른쪽 고정) */}
      <div>
        <Palette colors={colors} fixedOnTablet={true} onPick={handlePickColor} />
      </div>
    </main>
  );
}

/* ===================== 교사용 ===================== */
function AdminPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.().toISOString?.() ?? "",
      }));
      setItems(list);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    const ok = confirm("정말 이 제출을 삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "submissions", id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">교사용: 제출 관리</h2>
      <div className="grid md:grid-cols-[18rem_1fr] gap-4">
        {/* 왼쪽: 리스트 */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white shadow-sm">
          <h3 className="font-semibold mb-3">제출자 리스트</h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {items.length === 0 && <div className="text-sm text-black/50">제출 내역이 없습니다.</div>}
            {items.map((it) => (
              <div
                key={it.id}
                className={`w-full p-3 rounded-xl border ${
                  selected?.id === it.id ? "border-black/50" : "border-black/10"
                } hover:bg-black/5 flex items-center justify-between`}
                onClick={() => setSelected(it)}
              >
                <div>
                  <div className="font-medium">{it.name} ({it.studentId})</div>
                  <div className="text-xs text-black/60">{it.createdAt || "(시간 없음)"}</div>
                </div>
                <button
                  className="text-xs px-2 py-1 rounded-md border border-black/10 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 상세 (색상 렌더링) */}
        <div className="p-4 rounded-2xl border border-black/10 bg-white shadow-sm min-h-[50vh]">
          {!selected ? (
            <div className="text-sm text-black/50">왼쪽에서 제출자를 선택하세요.</div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-black/70">
                <div>이름: <b>{selected.name}</b></div>
                <div>학번: <b>{selected.studentId}</b></div>
                <div>제출시각: <b>{selected.createdAt}</b></div>
              </div>

              <div className="grid gap-4">
                {SCHEMES.map((s) => (
                  <div key={s.key}>
                    <div className="font-medium mb-2">{s.label}</div>
                    <div className="grid grid-cols-5 gap-2">
                      {(selected.data?.[s.key] || Array(5).fill(null)).map((txt, i) => {
                        if (!txt) {
                          return (
                            <div
                              key={i}
                              className="h-12 rounded-xl border border-black/10 bg-white"
                              title="(비어 있음)"
                            />
                          );
                        }
                        // "이름 | HEX | CMYK(...)" → HEX 파싱해서 배경색 적용
                        const parts = txt.split("|").map((p) => p.trim());
                        const colorName = parts[0] || "";
                        const hex = parts[1] || "#ffffff";
                        const cmyk = parts[2] || "";

                        return (
                          <div
                            key={i}
                            className="h-12 rounded-xl border border-black/10 flex items-center justify-center text-[10px] text-black/80"
                            style={{ background: hex }}
                            title={`${colorName} ${cmyk}`}
                          >
                            {colorName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <details className="text-xs text-black/60">
                <summary>원시 데이터</summary>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selected, null, 2)}</pre>
              </details>

              <button
                className="text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(selected.id)}
              >
                이 제출 삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== 앱 셸 ===================== */
function AppShell() {
  const route = useHashRoute();
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "/";
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-black/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          <nav className="flex items-center gap-3 text-sm">
            <a className="underline" href="#/">학생용</a>
            <span>·</span>
            <a className="underline" href="#/admin">교사용</a>
          </nav>
        </div>
      </header>

      {route === "/admin" ? <AdminPage /> : <StudentView onGoAdmin={() => (window.location.hash = "/admin")} />}
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
