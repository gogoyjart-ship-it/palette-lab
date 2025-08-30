import React, { useEffect, useMemo, useState } from "react";

// ===================== Firebase 연결 =====================
import { initializeApp } from "firebase/app";
import {
  getFirestore, addDoc, collection, serverTimestamp,
  onSnapshot, query, orderBy, deleteDoc, doc
} from "firebase/firestore";

// ▶▶ 본인 Firebase 콘솔의 구성값으로 교체하세요
const firebaseConfig = {
  apiKey: "AIzaSyBMTM7oMnr7QZxlr02bznXu7Jm2OZtuwtc",
  authDomain: "palette-lab-e60ce.firebaseapp.com",
  projectId: "palette-lab-e60ce",
  storageBucket: "palette-lab-e60ce.appspot.com", // ⚠️ appspot.com 이어야 정상
  messagingSenderId: "568599514296",
  appId: "1:568599514296:web:40bf43c8f891cffcb4b84d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================== 색상 팔레트 생성 =====================
function generateColorsRainbow() {
  const hues = Array.from({ length: 12 }, (_, i) => i * 30);
  const sats = [50, 60, 70];

  // 명도: 저명도 ↑, 중간톤 밀도 ↑
  const lows  = [15, 20, 25, 30, 35];
  const mids  = [50, 55, 60, 65, 60];
  const highs = [75, 85];
  const ligs = [...lows, ...mids, ...highs];

  const isGreenish = (h) => h >= 100 && h <= 140;

  const colors = [];
  for (const h of hues) {
    for (const s of sats) {
      for (const l of ligs) {
        // ✅ 녹색 계열은 4분의 1만 유지
        if (isGreenish(h) && ((s + l) % 4 !== 0)) continue;
        const satAdj = l < 40 ? Math.min(s + 10, 80) : s; // 저명도 채도 보정
        colors.push({ h, s: satAdj, l, css: `hsl(${h} ${satAdj}% ${l}%)` });
      }
    }
  }

  // ✅ Earth tone 추가
  const earthHues = [20, 30, 40, 90, 100];
  const earthSats = [25, 30, 35, 40];
  const earthLigs = [35, 45, 55, 65];
  for (const h of earthHues) {
    for (const s of earthSats) {
      for (const l of earthLigs) {
        colors.push({ h, s, l, css: `hsl(${h} ${s}% ${l}%)` });
      }
    }
  }

  // 무작위 섞기
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  return colors;
}

// ===================== 상수 정의 =====================
const SCHEMES = [
  { key: "tone_on_tone", label: "톤온톤" },
  { key: "tone_in_tone", label: "톤인톤" },
  { key: "separation", label: "세퍼레이션" },
  { key: "accent", label: "엑센트" },
  { key: "emotional", label: "감성배색" },
];

// ===================== 컴포넌트 =====================
// 🎨 팔레트 색상 단일 스와치
function Swatch({ color, onPick }) {
  return (
    <button
      className="w-6 h-6 rounded border border-black/10"
      style={{ background: color.css }}
      onClick={() => onPick(color)}
      title={color.css}
    />
  );
}

// 🎨 팔레트 전체
function Palette({ colors, fixedOnTablet, onPick }) {
  return (
    <div className={fixedOnTablet ? "md:fixed md:right-4 md:top-24 md:bottom-4 md:w-72 overflow-y-auto" : ""}>
      <div className="p-3 rounded-2xl border border-black/10 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">팔레트</h4>
          <span className="text-xs text-black/50">무작위 분포</span>
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

// 🎨 각 스킴 보드
function SchemeBoard({ title, schemeKey, value, selected, onSelect }) {
  return (
    <div className="p-3 rounded-2xl border border-black/10 bg-white">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="grid grid-cols-5 gap-2">
        {value.map((c, i) => (
          <div
            key={i}
            className={`h-12 rounded-xl border-2 cursor-pointer ${
              selected.schemeKey === schemeKey && selected.index === i
                ? "border-black"
                : "border-black/10"
            }`}
            style={{ background: c ? c.css : "#fff" }}
            onClick={() => onSelect({ schemeKey, index: i })}
          />
        ))}
      </div>
    </div>
  );
}

// ===================== 유틸 =====================
function useColorsRainbow() {
  const [seed, setSeed] = useState(() => Date.now());
  const colors = useMemo(() => generateColorsRainbow(), [seed]);
  return { colors, reshuffle: () => setSeed(Date.now()) };
}

function serializeSchemes(s) {
  const out = {};
  for (const sc of SCHEMES) out[sc.key] = (s[sc.key] || []).map((c) => (c ? c.css : null));
  return out;
}

async function saveSubmission(payload) {
  await addDoc(collection(db, "submissions"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash.replace(/^#/, "");
}

// ===================== 학생용 =====================
function StudentView({ onGoAdmin }) {
  const { colors } = useColorsRainbow();
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
      pageTitle: "배색 실습",
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
              schemeKey={s.key}
              value={schemes[s.key]}
              selected={selected}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* 팔레트 (태블릿 이상에서 오른쪽 고정) */}
      <div>
        <Palette colors={colors} fixedOnTablet={true} onPick={handlePickColor} />
      </div>
    </main>
  );
}

// ===================== 교사용 =====================
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
                      {(selected.data?.[s.key] || Array(5).fill(null)).map((css, i) => (
                        <div
                          key={i}
                          className="h-12 rounded-xl border border-black/10"
                          style={{ background: css || "#fff" }}
                          title={css || "(비어 있음)"}
                        />
                      ))}
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

// ===================== 앱 셸 =====================
function AppShell() {
  const route = useHashRoute();
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "/";
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-black/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">배색 실습</h1>
          <nav className="flex items-center gap-3 text-sm">
            <a className="underline" href="#/">학생용</a>
            <span>·</span>
            <a className="underline" href="#/admin">교사용</a>
          </nav>
        </div>
      </header>

      {route === "/admin" ? (
        <AdminPage />
      ) : (
        <StudentView onGoAdmin={() => (window.location.hash = "/admin")} />
      )}
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
