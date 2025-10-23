import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { candidates } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET all candidates for an election or position
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const positionId = searchParams.get('positionId');

    if (!electionId && !positionId) {
      return NextResponse.json(
        { error: 'Election ID or Position ID required' },
        { status: 400 }
      );
    }

    let candidatesList;
    if (positionId) {
      candidatesList = await db
        .select()
        .from(candidates)
        .where(eq(candidates.position_id, positionId));
    } else {
      candidatesList = await db
        .select()
        .from(candidates)
        .where(eq(candidates.election_id, electionId!));
    }

    return NextResponse.json(candidatesList);
  } catch (error) {
    console.error('Get candidates error:', error);
    return NextResponse.json(
      { error: 'Failed to get candidates' },
      { status: 500 }
    );
  }
}

// POST - Create a new candidate
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { election_id, position_id, display_name, manifesto_link, withdrawn = false } = body;

    if (!election_id || !position_id || !display_name) {
      return NextResponse.json(
        { error: 'Election ID, Position ID, and display name are required' },
        { status: 400 }
      );
    }

    const [candidate] = await db
      .insert(candidates)
      .values({
        election_id,
        position_id,
        display_name,
        manifesto_link: manifesto_link || null,
        withdrawn: withdrawn || false,
      })
      .returning();

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error('Create candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to create candidate' },
      { status: 500 }
    );
  }
}

// PATCH - Update a candidate
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, display_name, manifesto_link, withdrawn } = body;

    if (!id) {
      return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
    }

    const updates: Partial<{
      display_name: string
      manifesto_link: string | null
      withdrawn: boolean
    }> = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (manifesto_link !== undefined) updates.manifesto_link = manifesto_link;
    if (withdrawn !== undefined) updates.withdrawn = withdrawn;

    const [updated] = await db
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a candidate
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Candidate ID required' }, { status: 400 });
    }

    await db.delete(candidates).where(eq(candidates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
}

