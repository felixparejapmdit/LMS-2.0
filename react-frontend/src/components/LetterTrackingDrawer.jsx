import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronDown, FileText, Loader2, X } from "lucide-react";
import letterService from "../services/letterService";

export default function LetterTrackingDrawer({
  open,
  letter,
  onClose,
  side = "left",
}) {
  if (!open) return null;

  const isRight = side === "right";
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState("");

  const pdfUrl = useMemo(() => {
    const lmsId = (letter?.lms_id || "").toString().trim();
    if (!lmsId) return "";
    return letterService.getPublicPdfUrlByLmsId(lmsId);
  }, [letter?.lms_id]);

  useEffect(() => {
    if (!open) return;
    setIsPdfOpen(false);
    setPdfFailed(false);
    setPdfLoading(false);
    setPdfObjectUrl("");
  }, [open, letter?.lms_id]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const loadPdf = async () => {
    if (!pdfUrl) return;
    try {
      setPdfFailed(false);
      setPdfLoading(true);

      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
        setPdfObjectUrl("");
      }

      const res = await axios.get(pdfUrl, { responseType: "blob" });
      const blob = res.data;
      if (!blob || blob.size === 0) {
        setPdfFailed(true);
        return;
      }
      const objUrl = URL.createObjectURL(blob);
      setPdfObjectUrl(objUrl);
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full w-full">
        <div
          className={`w-full max-w-sm bg-white dark:bg-[#141414] shadow-2xl h-full relative animate-in ${
            isRight ? "slide-in-from-right" : "slide-in-from-left"
          } duration-500 flex flex-col`}
        >
        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-orange-500 uppercase tracking-tight">
                {letter?.lms_id || "—"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!pdfUrl) return;
                  setIsPdfOpen((v) => {
                    const next = !v;
                    if (next) loadPdf();
                    return next;
                  });
                }}
                className={`p-2 rounded-xl transition-colors ${
                  pdfUrl
                    ? "hover:bg-orange-50 dark:hover:bg-orange-900/10 text-orange-500"
                    : "opacity-40 cursor-not-allowed text-gray-400"
                }`}
                title="Preview PDF"
                aria-label="Preview PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              Activity Tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            aria-label="Close tracking"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
          {!letter ? (
            <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">
              Loading...
            </p>
          ) : !letter?.logs || letter.logs.length === 0 ? (
            <p className="text-center text-gray-400 py-20 uppercase font-black tracking-widest text-[10px]">
              No activity recorded yet.
            </p>
          ) : (
            <div className="relative">
              {(() => {
                const sorted = [...(letter.logs || [])].sort(
                  (a, b) =>
                    new Date(a.timestamp || a.log_date || 0) -
                    new Date(b.timestamp || b.log_date || 0),
                );

                const uniqueSequence = [];
                let lastStateKey = "";

                sorted.forEach((log) => {
                  const statusComp = (log.status?.status_name || "")
                    .trim()
                    .toUpperCase();
                  const stepComp = (log.step?.step_name || "")
                    .trim()
                    .toUpperCase();
                  const actionType = (log.action_type || "")
                    .trim()
                    .toUpperCase();
                  const deptComp = (log.department?.dept_code || "")
                    .trim()
                    .toUpperCase();

                  let displayHeading = "";
                  let displaySubheading = "";

                  const isPriority =
                    statusComp.includes("FILED") ||
                    actionType.includes("FILED") ||
                    statusComp.includes("HOLD") ||
                    actionType.includes("HOLD");

                  if (
                    actionType.includes("ENDORSE") ||
                    statusComp.includes("ENDORSE")
                  ) {
                    const endorsedTo = log.metadata?.endorsed_to;
                    if (!endorsedTo) return;

                    const activeEndorsersSet = new Set(
                      (letter?.endorsements || [])
                        .flatMap((e) =>
                          (e.endorsed_to || "").toString().split(";"),
                        )
                        .map((name) => name.trim().toLowerCase())
                        .filter(Boolean),
                    );

                    const validEndorsers = endorsedTo
                      .toString()
                      .split(";")
                      .map((p) => p.trim())
                      .filter(
                        (name) =>
                          name && activeEndorsersSet.has(name.toLowerCase()),
                      );

                    if (validEndorsers.length === 0) return;

                    displayHeading = validEndorsers.join(" • ");
                    displaySubheading = "";
                  } else if (
                    statusComp === "INCOMING" ||
                    statusComp === "PENDING"
                  ) {
                    displayHeading = "Processing";
                    displaySubheading = "For Incoming";
                  } else if (
                    stepComp === "VEM LETTER" &&
                    (statusComp.includes("REVIEW") || stepComp.includes("REVIEW"))
                  ) {
                    displayHeading = "Office of the Executive Minister";
                    displaySubheading = letter?.evemnote || "Being Reviewed";
                  } else if (
                    statusComp.includes("REVIEW") ||
                    stepComp.includes("REVIEW")
                  ) {
                    displayHeading = "ATG Office";
                    displaySubheading = letter?.atgnote || "Being Reviewed";
                  } else if (
                    stepComp === "VEM LETTER" ||
                    (deptComp === "EVM" && statusComp.includes("FORWARD"))
                  ) {
                    displayHeading = "Office of the Executive Minister";
                    displaySubheading = letter?.evemnote || "Processing";
                  } else if (
                    stepComp === "AEVM LETTER" ||
                    stepComp === "AEVEM LETTER" ||
                    (deptComp === "AEVM" && statusComp.includes("FORWARD"))
                  ) {
                    displayHeading = "Office of the Deputy Executive Minister";
                    displaySubheading = letter?.aevmnote || "Processing";
                  } else if (isPriority) {
                    displayHeading =
                      log.status?.status_name || log.action_type || actionType;
                    displaySubheading = log.metadata?.location || "";
                  } else {
                    displayHeading =
                      log.department?.dept_code ||
                      log.step?.step_name ||
                      "Activity";
                    displaySubheading = "";

                    if (displayHeading === "ATG") return;
                  }

                  const currentStateKey = `${displayHeading}-${displaySubheading}`.toUpperCase();
                  if (currentStateKey !== lastStateKey || isPriority) {
                    uniqueSequence.push({
                      ...log,
                      displayHeading,
                      displaySubheading,
                    });
                    lastStateKey = currentStateKey;
                  }
                });

                return uniqueSequence.map((log, i, arr) => {
                  const logDate = new Date(log.timestamp || log.log_date);
                  const isLastItem = i === arr.length - 1;
                  const isResolved = letter?.is_resolved;

                  return (
                    <div
                      key={i}
                      className="relative grid grid-cols-[90px_auto_1fr] items-start gap-3 mb-8"
                    >
                      <div className="text-right pt-0.5">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {logDate.toLocaleDateString("en-PH", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Manila",
                          })}
                        </p>
                        <p className="text-[10px] font-medium text-gray-400">
                          {logDate.toLocaleTimeString("en-PH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Asia/Manila",
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 ${
                            isResolved && isLastItem
                              ? "border-red-500 bg-red-500 shadow-lg shadow-red-500/30"
                              : "border-orange-400 bg-white dark:bg-[#141414]"
                          } z-10 flex items-center justify-center shrink-0`}
                        >
                          {!isLastItem || !isResolved ? (
                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                          ) : null}
                        </div>
                        {!isLastItem && (
                          <div className="flex flex-col items-center flex-1">
                            <div className="w-px flex-1 border-l-2 border-dashed border-gray-200 dark:border-[#333] min-h-[1.5rem]" />
                            <ChevronDown className="w-3 h-3 text-gray-300 -mt-1 mb-1" />
                          </div>
                        )}
                      </div>

                      <div className="pt-0.5">
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                          {log.displayHeading}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-pre-wrap">
                          {log.displaySubheading}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-[#222]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20"
          >
            Close
          </button>
        </div>
      </div>

        {isPdfOpen && (
          <div
            className={`flex flex-1 h-full animate-in fade-in duration-300 ${
              isRight ? "order-first" : "order-last"
            }`}
          >
            <div className="flex-1 h-full bg-white/70 dark:bg-black/40 backdrop-blur-3xl border-l border-white/30 dark:border-white/10 shadow-[0px_40px_100px_rgba(0,0,0,0.08)] hidden md:block">
              <div className="h-14 px-6 flex items-center justify-between border-b border-gray-100 dark:border-[#222]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    PDF Preview
                  </span>
                </div>
                {pdfLoading && (
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading
                  </div>
                )}
              </div>

              {pdfFailed ? (
                <div className="h-[calc(100%-3.5rem)] p-8 flex items-center justify-center">
                  <div className="max-w-md p-5 rounded-3xl bg-white dark:bg-[#141414] border border-slate-100 dark:border-white/10 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      No PDF available for this reference code.
                    </p>
                  </div>
                </div>
              ) : pdfObjectUrl ? (
                <iframe
                  title="PDF preview"
                  className="w-full h-[calc(100%-3.5rem)]"
                  src={pdfObjectUrl}
                />
              ) : (
                <div className="h-[calc(100%-3.5rem)] p-8 flex items-center justify-center">
                  <div className="max-w-md p-5 rounded-3xl bg-white dark:bg-[#141414] border border-slate-100 dark:border-white/10 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Select the PDF icon to load the file.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:hidden flex-1 h-full p-6 flex items-center justify-center">
              <div className="max-w-xs p-5 rounded-3xl bg-white dark:bg-[#141414] border border-slate-100 dark:border-white/10 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  PDF preview is available on larger screens.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
