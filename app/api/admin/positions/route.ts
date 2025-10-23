import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET all positions for an election
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID required' }, { status: 400 });
    }

    const positionsList = await db
      .select()
      .from(positions)
      .where(eq(positions.election_id, electionId))
      .orderBy(positions.sort_order);

    return NextResponse.json(positionsList);
  } catch (error) {
    console.error('Get positions error:', error);
    return NextResponse.json(
      { error: 'Failed to get positions' },
      { status: 500 }
    );
  }
}

// POST - Create a new position
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { election_id, name, description, seats = 1, sort_order = 0 } = body;

    if (!election_id || !name) {
      return NextResponse.json(
        { error: 'Election ID and name are required' },
        { status: 400 }
      );
    }

    const [position] = await db
      .insert(positions)
      .values({
        election_id,
        name,
        description: description || null,
        seats: seats || 1,
        sort_order: sort_order || 0,
      })
      .returning();

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error('Create position error:', error);
    return NextResponse.json(
      { error: 'Failed to create position' },
      { status: 500 }
    );
  }
}

// PATCH - Update a position
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, seats } = body;

    if (!id) {
      return NextResponse.json({ error: 'Position ID required' }, { status: 400 });
    }

    const updates: Partial<{
      name: string
      description: string | null
      seats: number
    }> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (seats !== undefined) updates.seats = seats;

    const [updated] = await db
      .update(positions)
      .set(updates)
      .where(eq(positions.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update position error:', error);
    return NextResponse.json(
      { error: 'Failed to update position' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a position
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Position ID required' }, { status: 400 });
    }

    await db.delete(positions).where(eq(positions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete position error:', error);
    return NextResponse.json(
      { error: 'Failed to delete position' },
      { status: 500 }
    );
  }
}

