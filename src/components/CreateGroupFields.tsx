import { Companion } from './CompanionCards';
import { View } from 'react-native';
import { Text } from './LocalizedText';
import { AdvancedPreferences, emptyPreferences } from './ActivityChoices';
import { NumberStepper } from './NumberStepper';
import { SelectionField } from './SelectionField';
import { listFriends } from '../services/friendService';
import { useRemote } from '../services/useRemote';
import { RemoteState } from './RemoteState';
import { colors } from '../theme';
import type { ActivityDraft } from '../services/activityService';

export function CreateGroupFields({ draft, onChange, editing = false, existingMembers = 1 }: { existingMembers?: number; onCompanionChange?: (index: number, patch: Partial<Companion>) => void; draft: ActivityDraft; onChange: (patch: Partial<ActivityDraft>) => void; editing?: boolean }) {
  const friends = useRemote(listFriends, []);
  const capacityFloor = Math.max(existingMembers, Number(draft.minParticipants || 2));
  return <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 20, fontWeight: '700' }}>Thiết lập nhóm</Text>
    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sức chứa tính cả host. Bạn có thể mời trực tiếp bạn bè trên GoMate; khi họ đồng ý sẽ tự động vào nhóm chat.</Text>
    <NumberStepper label="Tối thiểu" value={Number(draft.minParticipants || 2)} min={2} onChange={value => onChange({ minParticipants: String(value), maxParticipants: String(Math.max(value, Number(draft.maxParticipants || 6))) })} />
    <NumberStepper label="Tối đa" value={Number(draft.maxParticipants || 6)} min={capacityFloor} onChange={value => onChange({ maxParticipants: String(Math.max(value, capacityFloor)), minParticipants: String(Math.min(Math.max(value, capacityFloor), Number(draft.minParticipants || 2))) })} />
    {!editing && (friends.loading || friends.error ? <RemoteState {...friends} onRetry={friends.reload} /> : <SelectionField label="Thêm bạn bè trên GoMate" options={friends.data.map(friend => ({ value: friend.id, label: friend.name + (friend.username ? ' · @' + friend.username : ' · ' + friend.id.slice(0, 6)) }))} selected={draft.initialFriendIds ?? []} onChange={initialFriendIds => onChange({ initialFriendIds, reservedSeats: 0, companions: [] })} multiple searchable emptyLabel={friends.data.length ? 'Chọn bạn để gửi lời mời vào nhóm' : 'Chưa có bạn bè · có thể thêm sau khi đăng'} />)}
    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Đã có: host{!editing && (draft.initialFriendIds?.length ?? 0) > 0 ? ` · Đã chọn ${draft.initialFriendIds?.length} bạn trên GoMate (sẽ nhận thông báo mời tham gia)` : ''}.</Text>
    <AdvancedPreferences value={draft.participantPreferences || emptyPreferences} onChange={participantPreferences => onChange({ participantPreferences })} />
  </View>;
}
