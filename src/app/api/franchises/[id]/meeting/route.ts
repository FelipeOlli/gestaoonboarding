import { NextResponse } from "next/server";

import { MeetingConflictError } from "@/lib/meeting-conflicts";
import { MeetingSyncError } from "@/lib/meeting-sync";
import { cancelFranchiseMeeting } from "@/lib/services/meeting-cancel";
import {
  getFranchiseMeeting,
  updateFranchiseMeeting,
} from "@/lib/services/meetings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meeting = await getFranchiseMeeting(id);

  if (!meeting) {
    return NextResponse.json(null);
  }

  return NextResponse.json(meeting);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await cancelFranchiseMeeting(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MeetingSyncError) {
      return NextResponse.json(
        {
          error: error.message,
          syncFailed: true,
          meeting: error.meeting,
        },
        { status: 422 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const meeting = await updateFranchiseMeeting(id, body);
    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof MeetingConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          conflict: true,
          reason: error.details.reason,
          conflictingEvents: error.details.conflictingEvents,
        },
        { status: 409 },
      );
    }

    if (error instanceof MeetingSyncError) {
      return NextResponse.json(
        {
          error: error.message,
          syncFailed: true,
          meeting: error.meeting,
        },
        { status: 422 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
