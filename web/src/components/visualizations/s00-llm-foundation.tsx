"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { cn } from "@/lib/utils";

type RequestItem = {
  label: string;
  value: string;
};

type ResponseBlock = {
  type: "text" | "tool_use";
  title: string;
  body: string;
};

const STEP_INFO = [
  {
    title: "Push Messages In",
    desc: "s00 starts with one plain API call. You send messages[] to the model, nothing more.",
  },
  {
    title: "Declare the Call Shape",
    desc: "The request includes model, system, messages, and an optional tools array so the model is allowed to emit tool_use blocks.",
  },
  {
    title: "Read stop_reason",
    desc: "The first top-level signal is stop_reason. It tells you whether the model ended with text or is asking for a tool.",
  },
  {
    title: "Inspect Text Blocks",
    desc: "A normal assistant reply is a text content block. It is just data inside response.content[].",
  },
  {
    title: "Inspect Tool Blocks",
    desc: "A tool request is also just data: a block with type, tool name, and params.",
  },
  {
    title: "Stop Before Execution",
    desc: "s00 deliberately stops at inspection. s01 adds the loop that executes the tool and sends tool_result back.",
  },
];

const REQUESTS_PER_STEP: RequestItem[][] = [
  [
    { label: "messages[0]", value: '{ "role": "user", "content": "Use bash to print the current directory." }' },
  ],
  [
    { label: "model", value: "MODEL" },
    { label: "system", value: "You are a coding assistant..." },
    { label: "messages", value: "[user_message]" },
    { label: "tools", value: '[{ "name": "bash", "input_schema": { ... } }]' },
  ],
  [
    { label: "response.stop_reason", value: '"tool_use"' },
  ],
  [
    { label: "block.type", value: '"text"' },
    { label: "block.text", value: '"I can use bash for that."' },
  ],
  [
    { label: "block.type", value: '"tool_use"' },
    { label: "block.name", value: '"bash"' },
    { label: "block.input", value: '{ "command": "pwd" }' },
  ],
  [
    { label: "decision", value: '"observe only, do not execute yet"' },
  ],
];

const RESPONSES_PER_STEP: ResponseBlock[][] = [
  [],
  [],
  [],
  [
    {
      type: "text",
      title: "content[0]",
      body: "I can use bash for that.",
    },
  ],
  [
    {
      type: "tool_use",
      title: "content[1]",
      body: '{\n  "name": "bash",\n  "input": {\n    "command": "pwd"\n  }\n}',
    },
  ],
  [
    {
      type: "tool_use",
      title: "content[1]",
      body: '{\n  "name": "bash",\n  "input": {\n    "command": "pwd"\n  }\n}',
    },
  ],
];

export default function LlmFoundation({ title }: { title?: string }) {
  const {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    isPlaying,
    toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: STEP_INFO.length, autoPlayInterval: 2600 });

  const requestItems = REQUESTS_PER_STEP[currentStep];
  const responseBlocks = RESPONSES_PER_STEP[currentStep];
  const stepInfo = STEP_INFO[currentStep];
  const stopReason =
    currentStep >= 4 ? "tool_use" : currentStep >= 3 ? "end_turn" : "(waiting for reply)";

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "LLM Response Inspector"}
      </h2>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
                Request
              </div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                `client.messages.create(...)`
              </div>
            </div>
            <div className="rounded-full border border-zinc-200 px-3 py-1 font-mono text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              one call, no loop
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {requestItems.map((item) => (
                <motion.div
                  key={`${currentStep}-${item.label}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <div className="mb-1 font-mono text-xs text-zinc-400">{item.label}</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                    {item.value}
                  </pre>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
                Response
              </div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                inspect `stop_reason` and `content[]`
              </div>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 font-mono text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {stopReason}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              response.content[{responseBlocks.length}]
            </div>

            <AnimatePresence mode="popLayout">
              {responseBlocks.map((block, index) => (
                <motion.div
                  key={`${currentStep}-${block.title}-${index}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.22 }}
                  className={cn(
                    "rounded-lg border p-3",
                    block.type === "text"
                      ? "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
                      : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-400">{block.title}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                        block.type === "text"
                          ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      )}
                    >
                      {block.type}
                    </span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                    {block.body}
                  </pre>
                </motion.div>
              ))}
            </AnimatePresence>

            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-3 text-sm text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200"
              >
                The model proposed an action, but the harness has not executed anything yet.
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <StepControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrev={prev}
        onNext={next}
        onReset={reset}
        isPlaying={isPlaying}
        onToggleAutoPlay={toggleAutoPlay}
        stepTitle={stepInfo.title}
        stepDescription={stepInfo.desc}
      />
    </section>
  );
}
