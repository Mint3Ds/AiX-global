export type HandoffPayload = {
  business: string;
  branch: string;
  title: string;
  description: string;
  assigneeRole: string;
  evidence: { reviewId: string; quote: string }[];
  approvedBy: string;
  approvedAt: string;
};
export interface WorkflowHandoffAdapter {
  simulate(
    payload: HandoffPayload,
  ): Promise<{ status: "simulated_queued"; payload: HandoffPayload }>;
}
export const localHandoff: WorkflowHandoffAdapter = {
  async simulate(payload) {
    return { status: "simulated_queued", payload };
  },
};
