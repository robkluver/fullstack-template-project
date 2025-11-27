'use client';

/**
 * Reminders Page
 * List of reminders with snooze/complete/dismiss functionality.
 *
 * @see docs/PRODUCT_VISION.md - Section 3 Reminders
 * @see docs/frontend/DESIGN_GUIDELINES.md
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores';
import {
  remindersApi,
  type Reminder,
  type CreateReminderInput,
  type UpdateReminderInput,
} from '@/lib/api';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { ReminderModal } from '@/components/reminders/ReminderModal';

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    setActiveNavItem('reminders');
  }, [setActiveNavItem]);

  // Fetch reminders
  const {
    data: remindersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getReminders(undefined, 30), // Next 30 days
    staleTime: 30000, // 30 seconds
  });

  // Create reminder mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateReminderInput) => remindersApi.createReminder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Update reminder mutation
  const updateMutation = useMutation({
    mutationFn: ({
      reminderId,
      input,
      version,
    }: {
      reminderId: string;
      input: UpdateReminderInput;
      version: number;
    }) => remindersApi.updateReminder(reminderId, input, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Delete reminder mutation
  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) => remindersApi.deleteReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: ({
      reminderId,
      option,
      version,
    }: {
      reminderId: string;
      option: string;
      version: number;
    }) => remindersApi.snooze(reminderId, option, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: ({ reminderId, version }: { reminderId: string; version: number }) =>
      remindersApi.complete(reminderId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: ({ reminderId, version }: { reminderId: string; version: number }) =>
      remindersApi.dismiss(reminderId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  // Handlers
  const handleReminderClick = useCallback((reminder: Reminder) => {
    setSelectedReminder(reminder);
    setIsModalOpen(true);
  }, []);

  const handleSnooze = useCallback(
    (reminder: Reminder, option: string) => {
      snoozeMutation.mutate({
        reminderId: reminder.reminderId,
        option,
        version: reminder.version,
      });
    },
    [snoozeMutation]
  );

  const handleComplete = useCallback(
    (reminder: Reminder) => {
      completeMutation.mutate({
        reminderId: reminder.reminderId,
        version: reminder.version,
      });
    },
    [completeMutation]
  );

  const handleDismiss = useCallback(
    (reminder: Reminder) => {
      dismissMutation.mutate({
        reminderId: reminder.reminderId,
        version: reminder.version,
      });
    },
    [dismissMutation]
  );

  const handleSave = useCallback(
    (input: CreateReminderInput) => {
      createMutation.mutate(input);
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    (reminderId: string, input: UpdateReminderInput, version: number) => {
      updateMutation.mutate({ reminderId, input, version });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (reminderId: string) => {
      deleteMutation.mutate(reminderId);
    },
    [deleteMutation]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedReminder(null);
  }, []);

  const reminders = remindersData?.reminders || [];
  const pendingReminders = reminders.filter(
    (r) => r.status === 'PENDING' || r.status === 'SNOOZED'
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="p-4 px-6 border-b border-subtle bg-surface">
        <div className="max-w-[800px] mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-primary m-0">Reminders</h1>
          <button
            className="py-2 px-4 bg-accent border-none rounded-sm text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90"
            onClick={() => setIsModalOpen(true)}
          >
            + New Reminder
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary gap-3">Loading reminders...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary gap-3">
            <p>Failed to load reminders</p>
            <button
              className="py-2 px-4 bg-accent border-none rounded-sm text-white cursor-pointer"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['reminders'] })}
            >
              Retry
            </button>
          </div>
        ) : pendingReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="text-muted mb-4">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M24 4C14.059 4 6 12.059 6 22V32L2 38V40H46V38L42 32V22C42 12.059 33.941 4 24 4Z" />
                <path d="M18 40V42C18 45.314 20.686 48 24 48C27.314 48 30 45.314 30 42V40" />
              </svg>
            </div>
            <h2 className="text-lg text-primary m-0 mb-2">No reminders</h2>
            <p className="text-muted m-0">Click the button above to create a reminder.</p>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto flex flex-col gap-3">
            {pendingReminders.map((reminder) => (
              <ReminderCard
                key={reminder.reminderId}
                reminder={reminder}
                onClick={() => handleReminderClick(reminder)}
                onSnooze={(option) => handleSnooze(reminder, option)}
                onComplete={() => handleComplete(reminder)}
                onDismiss={() => handleDismiss(reminder)}
              />
            ))}
          </div>
        )}
      </main>

      <ReminderModal
        isOpen={isModalOpen}
        onClose={closeModal}
        reminder={selectedReminder}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
