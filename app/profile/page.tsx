'use client';

import { AppNav } from '@/components/app-nav';
import { ProfileChat } from '@/components/profile/profile-chat';
import { ProfileCard } from '@/components/profile/profile-card';
import { useLearningProfileStore } from '@/lib/store/learning-profile';
import { Button } from '@/components/ui/button';
import { MessageSquare, User } from 'lucide-react';

export default function ProfilePage() {
  const { profile, isChatOpen, setChatOpen } = useLearningProfileStore();

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container flex-1 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">学习画像</h1>
            <p className="text-muted-foreground">
              通过对话构建您的个性化学习画像，系统将根据画像为您推荐最合适的学习资源
            </p>
          </div>
          <Button onClick={() => setChatOpen(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {profile ? '更新画像' : '开始构建画像'}
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
                  <h3 className="mt-4 text-lg font-medium">尚未构建画像</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    点击&ldquo;开始构建画像&rdquo;，通过对话让AI了解您的学习需求
                  </p>
                  <Button onClick={() => setChatOpen(true)} className="mt-4 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    开始对话
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
