/** Local contract for the future Orbyte workflow adapter. This is not an API call. */
export type HandoffPayload = {
  businessId: string;
  propertyId: string;
  orbyteStaffId: string;
  taskId: string;
  taskVersion: number;
  dueDate: string;
  timezone: string;
  approvedTask: { title: string; instructions: string };
  linkedEvidence: { reviewIds: string[]; observationIds: string[] };
  approvedAt: string;
  status: "recorded_locally_not_sent";
};

export interface WorkflowHandoffAdapter {
  simulate(
    payload: HandoffPayload,
  ): Promise<{ status: "recorded_locally_not_sent"; payload: HandoffPayload }>;
}

export const localHandoff: WorkflowHandoffAdapter = {
  async simulate(payload) {
    return { status: "recorded_locally_not_sent", payload };
  },
};
