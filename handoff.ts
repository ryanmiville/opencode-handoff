import type { Plugin } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";

const goals = new Map<string, string>();

const handoffPlugin: Plugin = async ({ client }) => {
  return {
    "command.execute.before": async (input, output) => {
      if (input.command !== "handoff") return;
      const goal = input.arguments.trim();
      if (!goal) {
        output.parts.push({
          type: "text",
          text: "Error: Please provide a goal. Usage: /handoff YOUR GOAL HERE",
        } as Part);
        return;
      }

      goals.set(input.sessionID, goal);

      const { data: messages } = await client.session.messages({
        path: { id: input.sessionID },
      });
      const lastUser = messages?.findLast((m) => m.info.role === "user");
      if (!lastUser || lastUser.info.role !== "user") {
        output.parts.push({
          type: "text",
          text: "Error: No user message found to determine provider/model.",
        } as Part);
        return;
      }

      try {
        await client.session.summarize({
          path: { id: input.sessionID },
          body: {
            providerID: lastUser.info.model.providerID,
            modelID: lastUser.info.model.modelID,
          },
        });

        await client.session.promptAsync({
          path: { id: input.sessionID },
          body: {
            parts: [{ type: "text", text: goal }],
          },
        });
      } catch (error) {
        goals.delete(input.sessionID);
        output.parts.push({
          type: "text",
          text: `Error during handoff: ${error instanceof Error ? error.message : String(error)}`,
        } as Part);
      }
    },

    "experimental.session.compacting": async (input, output) => {
      const goal = goals.get(input.sessionID);
      if (!goal) return;
      goals.delete(input.sessionID);

      output.prompt = `You are generating a continuation summary for a handoff. The user has explicitly requested a handoff with the following goal:
      ${goal}

      Provide a detailed prompt for continuing our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next. The summary will be used so another agent can read it and continue the work.

      Prioritize, in order:
      1. Context relevant to accomplishing the specific handoff goal
      2. Files, decisions, and state needed to continue toward that goal
      3. Any blockers or requirements mentioned that relate to that goal
      4. Current progress toward that goal (if any)

      When constructing the summary, stick to this template:
      ---
      ## Goal

      [What goal(s) is the user trying to accomplish?]

      ## Instructions

      - [Important instructions the user gave that are relevant]
      - [If there is a plan or spec, include information about it so next agent can continue using it]

      ## Discoveries

      [Notable things learned during this conversation that would be useful for the next agent]

      ## Accomplished

      [What work has been completed, what work is still in progress, and what work is left?]

      ## Relevant files / directories

      [Structured list of relevant files that have been read, edited, or created. If all files in a directory are relevant, include the directory path.]
      ---`;
    },
  };
};

export default handoffPlugin;
