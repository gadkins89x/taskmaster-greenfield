import { useState } from 'react';
import {
  Bell,
  User,
  Shield,
  LogOut,
  ChevronRight,
  Mail,
  Smartphone,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { useAuthStore } from '../../stores/auth-store';
import {
  useNotificationPreferences,
  useUpdatePreference,
} from '../../hooks/use-notifications';
import {
  NotificationType,
  notificationTypeLabels,
  notificationCategories,
} from '../../lib/notifications-api';
import { cn } from '../../lib/utils';

type SettingsTab = 'profile' | 'notifications' | 'security';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('profile')}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </Button>
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('notifications')}
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Button>
        <Button
          variant={activeTab === 'security' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('security')}
        >
          <Shield className="mr-2 h-4 w-4" />
          Security
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileSection user={user} />}
      {activeTab === 'notifications' && <NotificationPreferencesSection />}
      {activeTab === 'security' && <SecuritySection onLogout={logout} />}
    </div>
  );
}

function ProfileSection({ user }: { user: { firstName: string; lastName: string; email: string } | null }) {
  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full" disabled>
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationPreferencesSection() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdatePreference();

  if (isLoading) {
    return <LoadingScreen message="Loading preferences..." />;
  }

  // Create a map of preferences for easy lookup
  const prefMap = new Map(
    (preferences || []).map(p => [p.notificationType, p])
  );

  // Get default preference values
  const getPreference = (type: NotificationType) => {
    return prefMap.get(type) || {
      notificationType: type,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
    };
  };

  const handleToggle = async (
    type: NotificationType,
    channel: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled',
    currentValue: boolean
  ) => {
    await updateMutation.mutateAsync({
      notificationType: type,
      [channel]: !currentValue,
    });
  };

  return (
    <div className="space-y-4">
      {/* Channel Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Push</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>In-App</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {Object.entries(notificationCategories).map(([category, types]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {types.map((type) => {
              const pref = getPreference(type);
              return (
                <div key={type} className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {notificationTypeLabels[type]}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ToggleButton
                      enabled={pref.emailEnabled}
                      onChange={() => handleToggle(type, 'emailEnabled', pref.emailEnabled)}
                      isPending={updateMutation.isPending}
                    />
                    <ToggleButton
                      enabled={pref.pushEnabled}
                      onChange={() => handleToggle(type, 'pushEnabled', pref.pushEnabled)}
                      isPending={updateMutation.isPending}
                    />
                    <ToggleButton
                      enabled={pref.inAppEnabled}
                      onChange={() => handleToggle(type, 'inAppEnabled', pref.inAppEnabled)}
                      isPending={updateMutation.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ToggleButton({
  enabled,
  onChange,
  isPending,
}: {
  enabled: boolean;
  onChange: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={isPending}
      className={cn(
        'flex h-6 w-10 items-center rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-muted',
        isPending && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'h-4 w-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function SecuritySection({ onLogout }: { onLogout: () => void }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="divide-y p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 hover:bg-accent/50 disabled:opacity-50"
            disabled
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Change Password</div>
                <div className="text-sm text-muted-foreground">
                  Update your account password
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardContent className="p-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
