"use client";

import { useState, useRef } from "react";

type POVBrief = {
  title: string;
  creative_problem: string;
  audience_reality: string[];
  creative_pov: string[];
  tone_guardrails: {
    bullets: string[];
    sample_line?: string;
  };
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

## The Creative Problem
${brief.creative_problem}

## Audience Reality
${brief.audience_reality.map(b => `• ${b}`).join("\n")}

## Creative POV
${brief.creative_pov.join("\n")}

## Tone & Language Guardrails
${brief.tone_guardrails.bullets.map(b => `• ${b}`).join("\n")}
${brief.tone_guardrails.sample_line ? `\n"${brief.tone_guardrails.sample_line}"` : ""}

## Watch-Outs
${brief.watch_outs.map(b => `• ${b}`).join("\n")}`;

    navigator.clipboard.writeText(text);
  }

  async function downloadPDF() {
    if (!brief) return;

    // Dynamically import jsPDF to keep it client-side only
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 60;
    const marginRight = 60;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 60;

    // Helper: add text with word wrap and page overflow handling
    function addWrappedText(
      text: string,
      x: number,
      startY: number,
      maxWidth: number,
      lineHeight: number
    ): number {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (startY + lineHeight > pageHeight - 50) {
          doc.addPage();
          startY = 60;
        }
        doc.text(line, x, startY);
        startY += lineHeight;
      });
      return startY;
    }

    // Helper: section label
    function addSectionLabel(label: string, startY: number): number {
      if (startY + 20 > pageHeight - 50) {
        doc.addPage();
        startY = 60;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      doc.text(label.toUpperCase(), marginLeft, startY);
      return startY + 18;
    }

    // Title
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 26);
    y = addWrappedText(brief.title, marginLeft, y, contentWidth, 28);
    y += 6;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 24;

    // The Creative Problem
    y = addSectionLabel("The Creative Problem", y);
    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.setTextColor(51, 51, 51);
    y = addWrappedText(brief.creative_problem, marginLeft, y, contentWidth, 20);
    y += 20;

    // Audience Reality
    y = addSectionLabel("Audience Reality", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(68, 68, 68);
    brief.audience_reality.forEach((item) => {
      y = addWrappedText(`• ${item}`, marginLeft + 4, y, contentWidth - 4, 18);
      y += 4;
    });
    y += 14;

    // Creative POV — shaded box
    y = addSectionLabel("Creative POV", y);
    const povStartY = y - 8;
    doc.setFillColor(250, 249, 247);
    const povLines = brief.creative_pov;
    const povLineHeight = 19;
    const povBlockHeight = povLines.length * povLineHeight + 24;
    if (y + povBlockHeight < pageHeight - 50) {
      doc.rect(marginLeft, povStartY, contentWidth, povBlockHeight, "F");
      doc.setFillColor(26, 26, 26);
      doc.rect(marginLeft, povStartY, 3, povBlockHeight, "F");
    }
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    povLines.forEach((line) => {
      y = addWrappedText(line, marginLeft + 16, y, contentWidth - 20, povLineHeight);
    });
    y += 20;

    // Tone & Language Guardrails
    y = addSectionLabel("Tone & Language Guardrails", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(68, 68, 68);
    brief.tone_guardrails.bullets.forEach((item) => {
      y = addWrappedText(`• ${item}`, marginLeft + 4, y, contentWidth - 4, 18);
      y += 4;
    });
    if (brief.tone_guardrails.sample_line) {
      y += 8;
      doc.setFillColor(245, 245, 245);
      const quoteLines = doc.splitTextToSize(
        `"${brief.tone_guardrails.sample_line}"`,
        contentWidth - 24
      );
      const quoteBlockHeight = quoteLines.length * 18 + 20;
      doc.rect(marginLeft, y - 10, contentWidth, quoteBlockHeight, "F");
      doc.setFont("times", "italic");
      doc.setFontSize(12);
      doc.setTextColor(85, 85, 85);
      y = addWrappedText(
        `"${brief.tone_guardrails.sample_line}"`,
        marginLeft + 12,
        y + 2,
        contentWidth - 24,
        18
      );
      y += 14;
    }
    y += 14;

    // Watch-Outs
    y = addSectionLabel("Watch-Outs", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(146, 64, 14);
    brief.watch_outs.forEach((item) => {
      y = addWrappedText(`• ${item}`, marginLeft + 4, y, contentWidth - 4, 18);
      y += 4;
    });

    // Footer
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      doc.text("Creative POV Brief", marginLeft, pageHeight - 28);
      doc.text(
        `${i} / ${totalPages}`,
        pageWidth - marginRight,
        pageHeight - 28,
        { align: "right" }
      );
    }

    // Save
    const safeTitle = brief.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    doc.save(`${safeTitle}-creative-pov.pdf`);
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
      <div style={styles.container}>
        {/* Input View */}
        {!brief && !loading && (
          <>
            <header style={styles.header}>
              <h1 style={styles.title}>Creative POV Brief</h1>
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
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: "100vh",
    background: "#faf9f7",
    padding: "60px 20px",
    fontFamily: "'Georgia', serif",
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 400,
    color: "#1a1a1a",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: 15,
    color: "#888",
    marginTop: 8,
  },
  dropZone: {
    background: "#fff",
    border: "2px dashed #d0d0d0",
    borderRadius: 12,
    padding: "60px 40px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  hiddenInput: {
    display: "none",
  },
  dropContent: {
    pointerEvents: "none",
  },
  dropIcon: {
    display: "block",
    fontSize: 32,
    color: "#999",
    marginBottom: 16,
  },
  dropText: {
    fontSize: 17,
    color: "#333",
    margin: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  dropHint: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    textAlign: "center",
    marginTop: 16,
  },
  loadingContainer: {
    textAlign: "center",
    padding: "80px 20px",
  },
  loadingFile: {
    fontSize: 14,
    color: "#666",
    margin: "0 0 8px 0",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  loadingText: {
    fontSize: 20,
    color: "#1a1a1a",
    margin: 0,
    fontStyle: "italic",
  },
  brief: {
    background: "#fff",
    padding: "48px",
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  briefHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
    paddingBottom: 24,
    borderBottom: "1px solid #eee",
    gap: 20,
  },
  briefTitle: {
    fontSize: 22,
    fontWeight: 400,
    color: "#1a1a1a",
    margin: 0,
    flex: 1,
    lineHeight: 1.3,
  },
  briefActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  copyButton: {
    padding: "8px 14px",
    fontSize: 13,
    color: "#555",
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  downloadButton: {
    padding: "8px 14px",
    fontSize: 13,
    color: "#555",
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  resetButton: {
    padding: "8px 14px",
    fontSize: 13,
    color: "#fff",
    background: "#1a1a1a",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    marginBottom: 12,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 1.75,
    color: "#333",
    margin: 0,
  },
  bulletList: {
    margin: 0,
    paddingLeft: 0,
    listStyle: "none",
  },
  bullet: {
    fontSize: 16,
    lineHeight: 1.65,
    color: "#444",
    paddingLeft: 18,
    position: "relative",
    marginBottom: 6,
  },
  povBox: {
    background: "#faf9f7",
    padding: "20px 24px",
    borderLeft: "3px solid #1a1a1a",
  },
  povLine: {
    fontSize: 17,
    lineHeight: 1.65,
    color: "#1a1a1a",
    margin: "0 0 6px 0",
    fontStyle: "italic",
  },
  sampleLine: {
    margin: "16px 0 0 0",
    padding: "14px 20px",
    background: "#f5f5f5",
    borderRadius: 4,
    fontSize: 15,
    fontStyle: "italic",
    color: "#555",
    borderLeft: "none",
  },
  watchOut: {
    fontSize: 16,
    lineHeight: 1.65,
    color: "#92400e",
    paddingLeft: 18,
    position: "relative",
    marginBottom: 6,
  },
};
