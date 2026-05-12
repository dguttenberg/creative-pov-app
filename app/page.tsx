"use client";

import { useState, useRef } from "react";

type POVBrief = {
  title: string;
  main_message: string;
  explicitly_requested: string[];
  creative_problem: string;
  audience_reality: string[];
  creative_pov: string[];
  tone_guardrails: {
    bullets: string[];
    sample_line?: string;
  };
  deliverables: string[];
  watch_outs: string[];
};

export default function Home() {
  const [brief, setBrief] = useState<POVBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);
    setBrief(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setBrief(data.brief);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: { files: dt.files } } as any);
    }
  }

  function copyToClipboard() {
    if (!brief) return;

    const text = `# ${brief.title}

## Main Message
${brief.main_message}

## Explicitly Requested
${brief.explicitly_requested.map(b => `• ${b}`).join("\n")}

## The Creative Problem
${brief.creative_problem}

## Audience Reality
${brief.audience_reality.map(b => `• ${b}`).join("\n")}

## Creative POV
${brief.creative_pov.join("\n")}

## Tone & Language Guardrails
${brief.tone_guardrails.bullets.map(b => `• ${b}`).join("\n")}
${brief.tone_guardrails.sample_line ? `\n"${brief.tone_guardrails.sample_line}"` : ""}

## Deliverables
${brief.deliverables.map(b => `☐ ${b}`).join("\n")}

## Watch-Outs
${brief.watch_outs.map(b => `• ${b}`).join("\n")}`;

    navigator.clipboard.writeText(text);
  }

  function downloadPDF() {
    if (!brief) return;

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(brief.title)} — Creative POV Brief</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
  <style>
    @page { margin: 56pt 60pt; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    :root {
      --dcp-midnight: #000531;
      --dcp-grey: #E6E7E8;
      --dcp-violet: #545DFF;
      --dcp-green: #20FE8F;
      --dcp-sky: #76BEFF;
      --dcp-ember: #FF8371;
      --dcp-white: #FFFFFF;
      --dcp-font: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--dcp-font);
      color: var(--dcp-midnight);
      background: var(--dcp-grey);
      font-size: 12pt;
      line-height: 1.6;
    }
    .page-header {
      background: var(--dcp-midnight);
      padding: 24pt 0 20pt;
      margin-bottom: 28pt;
    }
    .logo-mark {
      font-family: var(--dcp-font);
      font-weight: 700;
      font-size: 20pt;
      color: var(--dcp-green);
      letter-spacing: -0.03em;
    }
    h1 {
      font-size: 22pt;
      font-weight: 700;
      color: var(--dcp-midnight);
      text-transform: uppercase;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
      line-height: 1.1;
    }
    hr {
      border: none;
      border-top: 2px solid var(--dcp-green);
      margin: 16px 0 24px;
    }
    .label {
      font-family: var(--dcp-font);
      font-size: 7pt;
      font-weight: 700;
      color: var(--dcp-violet);
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-bottom: 8px;
    }
    .section { margin-bottom: 22px; }
    p.body-text { font-size: 12pt; color: var(--dcp-midnight); line-height: 1.75; }
    .main-message {
      font-size: 15pt;
      font-weight: 600;
      color: var(--dcp-midnight);
      line-height: 1.45;
      font-style: italic;
    }
    ul { list-style: none; padding: 0; }
    li {
      font-family: var(--dcp-font);
      font-size: 11pt;
      color: rgba(0,5,49,0.75);
      padding-left: 14px;
      margin-bottom: 5px;
      line-height: 1.6;
      position: relative;
    }
    li::before { content: "•"; position: absolute; left: 0; color: var(--dcp-violet); }
    li.explicit::before { content: "—"; position: absolute; left: 0; color: var(--dcp-midnight); }
    li.explicit { color: var(--dcp-midnight); font-weight: 600; }
    li.deliverable::before { content: "☐"; position: absolute; left: 0; color: var(--dcp-violet); }
    .pov-box {
      background: var(--dcp-midnight);
      border-left: 3px solid var(--dcp-green);
      padding: 16px 20px;
      border-radius: 6px;
    }
    .pov-box p {
      font-style: italic;
      color: var(--dcp-white);
      font-size: 12pt;
      margin-bottom: 5px;
      line-height: 1.65;
    }
    .sample {
      background: var(--dcp-midnight);
      padding: 12px 16px;
      margin-top: 12px;
      font-style: italic;
      color: var(--dcp-green);
      font-size: 11pt;
      line-height: 1.6;
      border-radius: 4px;
    }
    li.watch-out { color: var(--dcp-ember); }
    li.watch-out::before { color: var(--dcp-ember); }
    .footer {
      font-family: var(--dcp-font);
      font-size: 7.5pt;
      color: rgba(0,5,49,0.4);
      margin-top: 36px;
      border-top: 1px solid rgba(84,93,255,0.2);
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <h1>${esc(brief.title)}</h1>
  <hr />

  <div class="section">
    <div class="label">Main Message</div>
    <p class="main-message">${esc(brief.main_message)}</p>
  </div>

  ${brief.explicitly_requested?.length ? `
  <div class="section">
    <div class="label">Explicitly Requested</div>
    <ul>${brief.explicitly_requested.map(item => `<li class="explicit">${esc(item)}</li>`).join("")}</ul>
  </div>` : ""}

  <div class="section">
    <div class="label">The Creative Problem</div>
    <p class="body-text">${esc(brief.creative_problem)}</p>
  </div>

  <div class="section">
    <div class="label">Audience Reality</div>
    <ul>${brief.audience_reality.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
  </div>

  <div class="section">
    <div class="label">Creative POV</div>
    <div class="pov-box">
      ${brief.creative_pov.map(line => `<p>${esc(line)}</p>`).join("")}
    </div>
  </div>

  <div class="section">
    <div class="label">Tone &amp; Language Guardrails</div>
    <ul>${brief.tone_guardrails.bullets.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    ${brief.tone_guardrails.sample_line ? `<div class="sample">&ldquo;${esc(brief.tone_guardrails.sample_line)}&rdquo;</div>` : ""}
  </div>

  ${brief.deliverables?.length ? `
  <div class="section">
    <div class="label">Deliverables</div>
    <ul>${brief.deliverables.map(item => `<li class="deliverable">${esc(item)}</li>`).join("")}</ul>
  </div>` : ""}

  <div class="section">
    <div class="label">Watch-Outs</div>
    <ul>${brief.watch_outs.map(item => `<li class="watch-out">${esc(item)}</li>`).join("")}</ul>
  </div>

  <div class="footer">Creative POV Brief — DCP</div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0;";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) return;

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }, 400);
  }

  function reset() {
    setBrief(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main style={styles.main}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>DCP</span>
          <span style={styles.logoWordmark}>Doner{"\n"}Colle{"\n"}Partners.</span>
        </div>
      </nav>

      <div style={styles.container}>
        {/* Input View */}
        {!brief && !loading && (
          <>
            <header style={styles.header}>
              <div style={styles.eyebrow}>Creative Intelligence</div>
              <h1 style={styles.title}>CREATIVE POV<br /><em style={styles.titleAccent}>BRIEF</em></h1>
              <p style={styles.tagline}>Drop a request. Get creative direction.</p>
            </header>

            <div
              style={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.docx"
                onChange={handleFileSelect}
                style={styles.hiddenInput}
              />
              <div style={styles.dropContent}>
                <span style={styles.dropIcon}>↑</span>
                <p style={styles.dropText}>Drop a file or click to upload</p>
                <p style={styles.dropHint}>PDF, DOCX, TXT, JPG, PNG</p>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingFile}>{fileName}</p>
            <p style={styles.loadingText}>Reading the room...</p>
            <div style={styles.loadingBar}>
              <div style={styles.loadingBarFill} />
            </div>
          </div>
        )}

        {/* Output Brief */}
        {brief && (
          <article style={styles.brief}>
            <div style={styles.briefHeader}>
              <h2 style={styles.briefTitle}>{brief.title}</h2>
              <div style={styles.briefActions}>
                <button onClick={copyToClipboard} style={styles.copyButton}>
                  Copy
                </button>
                <button onClick={downloadPDF} style={styles.downloadButton}>
                  Download PDF
                </button>
                <button onClick={reset} style={styles.resetButton}>
                  New Brief
                </button>
              </div>
            </div>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Main Message</h3>
              <p style={styles.mainMessage}>{brief.main_message}</p>
            </section>

            {brief.explicitly_requested?.length > 0 && (
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Explicitly Requested</h3>
                <ul style={styles.bulletList}>
                  {brief.explicitly_requested.map((item, i) => (
                    <li key={i} style={styles.explicitItem}>— {item}</li>
                  ))}
                </ul>
              </section>
            )}

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>The Creative Problem</h3>
              <p style={styles.paragraph}>{brief.creative_problem}</p>
            </section>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Audience Reality</h3>
              <ul style={styles.bulletList}>
                {brief.audience_reality.map((item, i) => (
                  <li key={i} style={styles.bullet}>{item}</li>
                ))}
              </ul>
            </section>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Creative POV</h3>
              <div style={styles.povBox}>
                {brief.creative_pov.map((line, i) => (
                  <p key={i} style={styles.povLine}>{line}</p>
                ))}
              </div>
            </section>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Tone & Language Guardrails</h3>
              <ul style={styles.bulletList}>
                {brief.tone_guardrails.bullets.map((item, i) => (
                  <li key={i} style={styles.bullet}>{item}</li>
                ))}
              </ul>
              {brief.tone_guardrails.sample_line && (
                <blockquote style={styles.sampleLine}>
                  "{brief.tone_guardrails.sample_line}"
                </blockquote>
              )}
            </section>

            {brief.deliverables?.length > 0 && (
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Deliverables</h3>
                <ul style={styles.bulletList}>
                  {brief.deliverables.map((item, i) => (
                    <li key={i} style={styles.deliverable}>☐ {item}</li>
                  ))}
                </ul>
              </section>
            )}

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Watch-Outs</h3>
              <ul style={styles.bulletList}>
                {brief.watch_outs.map((item, i) => (
                  <li key={i} style={styles.watchOut}>{item}</li>
                ))}
              </ul>
            </section>
          </article>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.logo}>
            <span style={styles.logoMarkDark}>DCP</span>
            <span style={styles.logoWordmarkDark}>Doner{"\n"}Colle{"\n"}Partners.</span>
          </div>
          <span style={styles.footerCopy}>© 2026 DonerColle Partners. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

const DCP = {
  midnight: "#000531",
  grey: "#E6E7E8",
  violet: "#545DFF",
  green: "#20FE8F",
  sky: "#76BEFF",
  ember: "#FF8371",
  white: "#FFFFFF",
  offwhite: "#F4F5F7",
  font: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
};

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: "100vh",
    background: DCP.grey,
    fontFamily: DCP.font,
    display: "flex",
    flexDirection: "column",
  },

  // Nav
  nav: {
    background: DCP.midnight,
    display: "flex",
    alignItems: "center",
    padding: "0 40px",
    height: 68,
    borderBottom: `1px solid rgba(32,254,143,0.12)`,
    flexShrink: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoMark: {
    fontFamily: DCP.font,
    fontWeight: 700,
    fontSize: 28,
    color: DCP.green,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  logoWordmark: {
    fontFamily: DCP.font,
    fontWeight: 700,
    fontSize: 11,
    lineHeight: 1.25,
    color: DCP.white,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderLeft: `1px solid rgba(255,255,255,0.25)`,
    paddingLeft: 14,
    whiteSpace: "pre" as const,
  },

  // Main content
  container: {
    maxWidth: 700,
    margin: "0 auto",
    padding: "60px 20px",
    flex: 1,
    width: "100%",
  },

  // Header / hero
  header: {
    marginBottom: 48,
  },
  eyebrow: {
    fontFamily: DCP.font,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.24em",
    textTransform: "uppercase" as const,
    color: DCP.violet,
    marginBottom: 16,
  },
  title: {
    fontSize: 52,
    fontWeight: 700,
    color: DCP.midnight,
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.0,
    textTransform: "uppercase" as const,
  },
  titleAccent: {
    color: DCP.violet,
    fontStyle: "normal",
  },
  tagline: {
    fontSize: 15,
    color: "rgba(0,5,49,0.5)",
    marginTop: 16,
    fontWeight: 400,
  },

  // Drop zone
  dropZone: {
    background: DCP.midnight,
    border: `2px dashed rgba(84,93,255,0.4)`,
    borderRadius: 12,
    padding: "60px 40px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  hiddenInput: {
    display: "none",
  },
  dropContent: {
    pointerEvents: "none" as const,
  },
  dropIcon: {
    display: "block",
    fontSize: 32,
    color: DCP.green,
    marginBottom: 16,
  },
  dropText: {
    fontSize: 17,
    color: DCP.white,
    margin: 0,
    fontWeight: 500,
  },
  dropHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: 8,
    fontWeight: 400,
  },
  error: {
    color: DCP.ember,
    fontSize: 14,
    textAlign: "center" as const,
    marginTop: 16,
    fontWeight: 500,
  },

  // Loading
  loadingContainer: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },
  loadingFile: {
    fontSize: 13,
    color: "rgba(0,5,49,0.5)",
    margin: "0 0 8px 0",
    fontWeight: 500,
  },
  loadingText: {
    fontSize: 24,
    color: DCP.midnight,
    margin: "0 0 32px 0",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "-0.01em",
  },
  loadingBar: {
    width: 200,
    height: 3,
    background: "rgba(0,5,49,0.1)",
    borderRadius: 2,
    margin: "0 auto",
    overflow: "hidden",
  },
  loadingBarFill: {
    width: "60%",
    height: "100%",
    background: DCP.green,
    borderRadius: 2,
    animation: "none",
  },

  // Brief card
  brief: {
    background: DCP.midnight,
    padding: "48px",
    borderRadius: 12,
    border: `1px solid rgba(84,93,255,0.2)`,
  },
  briefHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
    paddingBottom: 28,
    borderBottom: `1px solid rgba(32,254,143,0.15)`,
    gap: 20,
  },
  briefTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: DCP.white,
    margin: 0,
    flex: 1,
    lineHeight: 1.2,
    textTransform: "uppercase" as const,
    letterSpacing: "-0.01em",
  },
  briefActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  copyButton: {
    padding: "9px 18px",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    background: "transparent",
    border: `1.5px solid rgba(255,255,255,0.15)`,
    borderRadius: 40,
    cursor: "pointer",
    fontFamily: DCP.font,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  downloadButton: {
    padding: "9px 18px",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    background: "transparent",
    border: `1.5px solid rgba(255,255,255,0.15)`,
    borderRadius: 40,
    cursor: "pointer",
    fontFamily: DCP.font,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  resetButton: {
    padding: "9px 18px",
    fontSize: 12,
    color: DCP.midnight,
    background: DCP.green,
    border: "none",
    borderRadius: 40,
    cursor: "pointer",
    fontFamily: DCP.font,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },

  // Brief sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: DCP.violet,
    textTransform: "uppercase" as const,
    letterSpacing: "0.2em",
    marginBottom: 12,
    fontFamily: DCP.font,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 1.75,
    color: "rgba(255,255,255,0.75)",
    margin: 0,
    fontWeight: 400,
  },
  mainMessage: {
    fontSize: 20,
    lineHeight: 1.5,
    color: DCP.white,
    margin: 0,
    fontStyle: "italic",
    fontWeight: 500,
  },
  explicitItem: {
    fontSize: 15,
    lineHeight: 1.65,
    color: DCP.white,
    fontWeight: 600,
    paddingLeft: 18,
    position: "relative" as const,
    marginBottom: 6,
  },
  deliverable: {
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.7)",
    paddingLeft: 22,
    position: "relative" as const,
    marginBottom: 6,
    fontWeight: 400,
  },
  bulletList: {
    margin: 0,
    paddingLeft: 0,
    listStyle: "none",
  },
  bullet: {
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.65)",
    paddingLeft: 18,
    position: "relative" as const,
    marginBottom: 6,
    fontWeight: 400,
  },
  povBox: {
    background: "rgba(32,254,143,0.06)",
    padding: "20px 24px",
    borderLeft: `3px solid ${DCP.green}`,
    borderRadius: "0 8px 8px 0",
  },
  povLine: {
    fontSize: 16,
    lineHeight: 1.65,
    color: DCP.white,
    margin: "0 0 6px 0",
    fontStyle: "italic",
    fontWeight: 400,
  },
  sampleLine: {
    margin: "16px 0 0 0",
    padding: "14px 20px",
    background: "rgba(84,93,255,0.12)",
    borderRadius: 6,
    fontSize: 14,
    fontStyle: "italic",
    color: DCP.sky,
    borderLeft: "none",
    fontWeight: 400,
  },
  watchOut: {
    fontSize: 15,
    lineHeight: 1.65,
    color: DCP.ember,
    paddingLeft: 18,
    position: "relative" as const,
    marginBottom: 6,
    fontWeight: 400,
  },

  // Footer
  footer: {
    background: DCP.midnight,
    borderTop: `1px solid rgba(32,254,143,0.12)`,
    padding: "32px 40px",
    flexShrink: 0,
  },
  footerInner: {
    maxWidth: 700,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  logoMarkDark: {
    fontFamily: DCP.font,
    fontWeight: 700,
    fontSize: 20,
    color: DCP.green,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  logoWordmarkDark: {
    fontFamily: DCP.font,
    fontWeight: 700,
    fontSize: 10,
    lineHeight: 1.25,
    color: DCP.white,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderLeft: `1px solid rgba(255,255,255,0.2)`,
    paddingLeft: 12,
    whiteSpace: "pre" as const,
  },
  footerCopy: {
    fontFamily: DCP.font,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontWeight: 400,
  },
};
