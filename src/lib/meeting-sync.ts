import type { FranchiseMeeting } from "@/lib/services/meetings";

export class MeetingSyncError extends Error {
  readonly meeting: FranchiseMeeting;

  constructor(message: string, meeting: FranchiseMeeting) {
    super(message);
    this.name = "MeetingSyncError";
    this.meeting = meeting;
  }
}
