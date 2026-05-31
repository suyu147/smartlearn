'use client';

import { AppNav } from '@/components/app-nav';
import { ProfileChat } from '@/components/profile/profile-chat';
import { ProfileCard } from '@/components/profile/profile-card';
import { useLearningProfileStore } from '@/lib/store/learning-profile';
import { Button } from '@/components/ui/button';
import { MessageSquare, User } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';

export default function ProfilePage() {
  const { profile, isChatOpen, setChatOpen } = useLearningProfileStore();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container flex-1 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('profilePage.title')}</h1>
            <p className="text-muted-foreground">
              {t('profilePage.subtitle')}
            </p>
          </div>
          <Button onClick={() => setChatOpen(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {profile ? t('profilePage.updateProfile') : t('profilePage.startBuild')}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isChatOpen ? (
              <ProfileChat />
            ) : (
              <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">{t('profilePage.notBuilt')}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('profilePage.notBuiltHint')}
                  </p>
                  <Button onClick={() => setChatOpen(true)} className="mt-4 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('profilePage.startChat')}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <ProfileCard />
          </div>
        </div>
      </div>
    </div>
  );
}
