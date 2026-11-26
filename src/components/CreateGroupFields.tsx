import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Companion } from './CompanionCards';
import { Text } from './LocalizedText';
import { AdvancedPreferences, emptyPreferences } from './ActivityChoices';
import { NumberStepper } from './NumberStepper';
import { SelectionField } from './SelectionField';
import { UserAvatar } from './UserAvatar';
import { listFriends } from '../services/friendService';
import { useRemote } from '../services/useRemote';
import { RemoteState } from './RemoteState';
import { colors } from '../theme';
import type { ActivityDraft } from '../services/activityService';

export function CreateGroupFields({
  draft,
  onChange,
  editing = false,
  existingMembers = 1,
}: {
  existingMembers?: number;
  onCompanionChange?: (index: number, patch: Partial<Companion>) => void;
  draft: ActivityDraft;
  onChange: (patch: Partial<ActivityDraft>) => void;
  editing?: boolean;
}) {
  const friends = useRemote(listFriends, [], true, {
    cacheKey: 'friends-list',
    staleTimeMs: 30000,
    tags: ['friends'],
  });
  const capacityFloor = Math.max(existingMembers, Number(draft.minParticipants || 2));
  const selectedIds = draft.initialFriendIds ?? [];
  const selectedFriends = friends.data.filter(f => selectedIds.includes(f.id));

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Thiết lập nhóm</Text>

      <View style={styles.stepperRow}>
        <View style={{ flex: 1 }}>
          <NumberStepper
            label="Tối thiểu"
            value={Number(draft.minParticipants || 2)}
            min={2}
            onChange={value =>
              onChange({
                minParticipants: String(value),
                maxParticipants: String(Math.max(value, Number(draft.maxParticipants || 6))),
              })
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <NumberStepper
            label="Tối đa"
            value={Number(draft.maxParticipants || 6)}
            min={capacityFloor}
            onChange={value =>
              onChange({
                maxParticipants: String(Math.max(value, capacityFloor)),
                minParticipants: String(Math.min(Math.max(value, capacityFloor), Number(draft.minParticipants || 2))),
              })
            }
          />
        </View>
      </View>

      {!editing && (
        <View style={styles.friendsCard}>
          {friends.loading || friends.error ? (
            <RemoteState {...friends} onRetry={friends.reload} />
          ) : (
            <>
              <SelectionField
                label="Mời bạn bè trên GoMate (Tùy chọn)"
                options={friends.data.map(friend => ({
                  value: friend.id,
                  label: friend.name,
                  subtitle: friend.username ? `@${friend.username}` : friend.location || 'Bạn bè GoMate',
                  avatarUrl: friend.avatarUrl ?? null,
                }))}
                selected={selectedIds}
                onChange={initialFriendIds => onChange({ initialFriendIds, reservedSeats: 0, companions: [] })}
                multiple
                searchable
                emptyLabel={friends.data.length ? `Chọn từ ${friends.data.length} bạn bè để mời vào nhóm` : 'Chưa có bạn bè · có thể mời sau khi đăng'}
              />
              {selectedFriends.length > 0 && (
                <View style={styles.friendChips}>
                  {selectedFriends.map(friend => (
                    <Pressable
                      key={friend.id}
                      onPress={() => onChange({ initialFriendIds: selectedIds.filter(id => id !== friend.id) })}
                      style={styles.friendChip}
                    >
                      <UserAvatar uri={friend.avatarUrl} name={friend.name} size={24} />
                      <Text style={styles.friendChipName}>{friend.name}</Text>
                      <Ionicons name="close" size={14} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      <AdvancedPreferences
        value={draft.participantPreferences || emptyPreferences}
        onChange={participantPreferences => onChange({ participantPreferences })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepperRow: { flexDirection: 'row', gap: 12 },
  friendsCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  friendChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 20, paddingVertical: 5, paddingLeft: 6, paddingRight: 10 },
  friendChipName: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
