import { ProfileScreen } from './ProfileScreen';

export function EditProfileScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  return <ProfileScreen editing onFinish={onSaved} onSkip={onBack} />;
}
