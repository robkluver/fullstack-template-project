import type { Meta, StoryObj } from '@storybook/react';
import { NoteCard } from './NoteCard';
import { NOTE_COLORS } from '@/lib/api';

const meta: Meta<typeof NoteCard> = {
  title: 'Components/Notes/NoteCard',
  component: NoteCard,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['grid', 'list'],
    },
    note: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof NoteCard>;

const mockNote = {
  noteId: 'note-1',
  title: 'Project Ideas',
  body: 'Some ideas for the upcoming quarter:\n\n1. Implement dark mode\n2. Add keyboard shortcuts\n3. Mobile app development',
  color: NOTE_COLORS[0].value,
  tags: ['work', 'ideas', 'planning'],
  isPinned: false,
  status: 'ACTIVE' as const,
  version: 1,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-20T14:30:00Z',
};

const mockNoteNoBody = {
  noteId: 'note-no-body',
  title: 'Quick Note',
  color: NOTE_COLORS[0].value,
  tags: ['quick'],
  isPinned: false,
  status: 'ACTIVE' as const,
  version: 1,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-20T14:30:00Z',
};

export const Default: Story = {
  args: {
    note: mockNote,
    variant: 'grid',
  },
};

export const Pinned: Story = {
  args: {
    note: {
      ...mockNote,
      isPinned: true,
    },
    variant: 'grid',
  },
};

export const ListView: Story = {
  args: {
    note: mockNote,
    variant: 'list',
  },
};

export const LongTitle: Story = {
  args: {
    note: {
      ...mockNote,
      title: 'This is a very long note title that should be truncated when displayed in the card view',
    },
    variant: 'grid',
  },
};

export const NoBody: Story = {
  args: {
    note: mockNoteNoBody,
    variant: 'grid',
  },
};

export const ManyTags: Story = {
  args: {
    note: {
      ...mockNote,
      tags: ['work', 'ideas', 'planning', 'urgent', 'review', 'team'],
    },
    variant: 'grid',
  },
};

export const DifferentColors: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 200px)', gap: '16px' }}>
      {NOTE_COLORS.slice(0, 8).map((color) => (
        <NoteCard
          key={color.value}
          note={{
            ...mockNote,
            noteId: color.value,
            title: color.label,
            color: color.value,
          }}
          variant="grid"
        />
      ))}
    </div>
  ),
};

export const GridLayout: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 240px)', gap: '16px' }}>
      <NoteCard
        note={{ ...mockNote, noteId: '1', title: 'Meeting Notes', color: '#3b82f6' }}
        variant="grid"
      />
      <NoteCard
        note={{ ...mockNote, noteId: '2', title: 'Todo List', color: '#22c55e', isPinned: true }}
        variant="grid"
      />
      <NoteCard
        note={{ ...mockNote, noteId: '3', title: 'Project Plan', color: '#f59e0b' }}
        variant="grid"
      />
      <NoteCard
        note={{ ...mockNoteNoBody, noteId: '4', title: 'Research', color: '#8b5cf6' }}
        variant="grid"
      />
      <NoteCard
        note={{ ...mockNote, noteId: '5', title: 'Ideas', color: '#ec4899' }}
        variant="grid"
      />
      <NoteCard
        note={{ ...mockNote, noteId: '6', title: 'Archive', color: '#64748b' }}
        variant="grid"
      />
    </div>
  ),
};
