import { supabase } from '@/integrations/supabase/client';
import { getCompanyId } from './company';

export async function seedMockData() {
  // Only run on localhost
  if (typeof window === 'undefined') return;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost) return;

  // Check if already seeded
  const seededKey = 'formify_mock_data_seeded';
  if (localStorage.getItem(seededKey)) {
    console.log('[Seed] Mock data already seeded');
    return;
  }

  try {
    console.log('[Seed] Starting mock data seed...');
    
    const companyId = await getCompanyId({ allowFallback: true });
    if (!companyId) {
      console.error('[Seed] No company ID available');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Seed] No user found');
      return;
    }

    // Create mock event types
    const { data: eventTypes, error: eventTypesError } = await supabase
      .from('event_types')
      .insert([
        {
          user_id: user.id,
          company_id: companyId,
          name: 'Discovery Call',
          slug: 'discovery-call',
          description: 'Initial consultation call',
          duration_minutes: 30,
          location_type: 'video',
          is_active: true,
          color: '#3b82f6',
        },
        {
          user_id: user.id,
          company_id: companyId,
          name: 'Strategy Session',
          slug: 'strategy-session',
          description: 'Deep dive strategy planning',
          duration_minutes: 60,
          location_type: 'video',
          is_active: true,
          color: '#8b5cf6',
        },
        {
          user_id: user.id,
          company_id: companyId,
          name: 'Follow-up Call',
          slug: 'follow-up',
          description: 'Follow-up discussion',
          duration_minutes: 15,
          location_type: 'phone',
          is_active: true,
          color: '#22c55e',
        },
      ])
      .select();

    if (eventTypesError) {
      console.error('[Seed] Error creating event types:', eventTypesError);
      return;
    }

    console.log('[Seed] Created event types:', eventTypes?.length);

    // Create mock bookings
    const now = new Date();
    const bookings = [];

    for (let i = 0; i < 8; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - daysAgo);
      startTime.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      const eventType = eventTypes![Math.floor(Math.random() * eventTypes!.length)];
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + eventType.duration_minutes);

      const isConverted = Math.random() > 0.5;
      const conversionAmount = isConverted ? Math.floor(Math.random() * 5000) + 500 : null;

      bookings.push({
        event_type_id: eventType.id,
        host_user_id: user.id,
        company_id: companyId,
        invitee_name: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Brown', 'David Wilson'][Math.floor(Math.random() * 5)],
        invitee_email: `client${i}@example.com`,
        invitee_timezone: 'America/New_York',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        is_converted: isConverted,
        conversion_amount: conversionAmount,
        converted_at: isConverted ? startTime.toISOString() : null,
      });
    }

    const { data: createdBookings, error: bookingsError } = await supabase
      .from('bookings')
      .insert(bookings)
      .select();

    if (bookingsError) {
      console.error('[Seed] Error creating bookings:', bookingsError);
      return;
    }

    console.log('[Seed] Created bookings:', createdBookings?.length);

    // Create revenue entries linked to bookings
    const revenueEntries: any[] = createdBookings
      ?.filter(b => b.is_converted && b.conversion_amount)
      .map(booking => ({
        id: `booking-${booking.id}`,
        company_id: companyId,
        entry_date: new Date(booking.start_time).toISOString().split('T')[0],
        amount: booking.conversion_amount,
        description: `Converted from ${booking.invitee_name}`,
        source: 'booking',
        booking_id: booking.id,
        event_type_id: booking.event_type_id,
      })) || [];

    // Add some manual revenue entries
    for (let i = 0; i < 5; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const entryDate = new Date(now);
      entryDate.setDate(entryDate.getDate() - daysAgo);

      revenueEntries.push({
        company_id: companyId,
        entry_date: entryDate.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 3000) + 200,
        description: ['Affiliate Sale', 'Direct Sale', 'Upsell', 'Renewal', 'Referral'][i],
        source: 'manual',
      });
    }

    // Use edge proxy to bypass RLS for seeding
    try {
      const response = await fetch('/api/edge-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'manage-revenue',
          method: 'POST',
          payload: {
            action: 'bulk_insert',
            entries: revenueEntries,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Seed] Error creating revenue entries via proxy:', errorData);
        return;
      }

      console.log('[Seed] Created revenue entries:', revenueEntries.length);
    } catch (error) {
      console.error('[Seed] Failed to create revenue entries:', error);
      return;
    }

    // Mark as seeded
    localStorage.setItem(seededKey, 'true');
    console.log('[Seed] ✅ Mock data seeded successfully!');
    
  } catch (error) {
    console.error('[Seed] Error seeding mock data:', error);
  }
}
