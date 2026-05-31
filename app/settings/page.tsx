'use client';

import { AppNav } from '@/components/app-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/store/settings';
import { Settings, Key, Globe, Palette } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';

export default function SettingsPage() {
  const {
    providerId,
    modelId,
    apiKey,
    apiSecret,
    baseUrl,
    theme,
    language,
    setProviderId,
    setModelId,
    setApiKey,
    setApiSecret,
    setBaseUrl,
    setTheme,
    setLanguage,
  } = useSettingsStore();

  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container max-w-2xl flex-1 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('settingsPage.title')}</h1>
          <p className="text-muted-foreground">{t('settingsPage.description')}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                {t('settingsPage.aiModel.title')}
              </CardTitle>
              <CardDescription>{t('settingsPage.aiModel.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settingsPage.aiModel.provider')}</Label>
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spark">{t('settingsPage.providers.spark')}</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="kimi">Kimi</SelectItem>
                    <SelectItem value="qwen">{t('settingsPage.providers.qwen')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settingsPage.aiModel.model')}</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerId === 'spark' && (
                      <>
                        <SelectItem value="lite">{t('settingsPage.models.sparkLite')}</SelectItem>
                        <SelectItem value="generalv3">{t('settingsPage.models.sparkPro')}</SelectItem>
                        <SelectItem value="pro-128k">{t('settingsPage.models.sparkPro128k')}</SelectItem>
                        <SelectItem value="4.0Ultra">{t('settingsPage.models.spark4Ultra')}</SelectItem>
                      </>
                    )}
                    {providerId === 'openai' && (
                      <>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
                      </>
                    )}
                    {providerId === 'deepseek' && (
                      <>
                        <SelectItem value="deepseek-chat">DeepSeek-Chat</SelectItem>
                        <SelectItem value="deepseek-reasoner">DeepSeek-Reasoner</SelectItem>
                      </>
                    )}
                    {providerId === 'kimi' && (
                      <>
                        <SelectItem value="moonshot-v1-128k">Moonshot V1 128K</SelectItem>
                      </>
                    )}
                    {providerId === 'qwen' && (
                      <>
                        <SelectItem value="qwen3-max">Qwen3 Max</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settingsPage.aiModel.apiKeyPlaceholder')}
                />
              </div>

              {providerId === 'spark' && (
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={t('settingsPage.aiModel.apiSecretPlaceholder')}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('settingsPage.aiModel.baseUrlLabel')}</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t('settingsPage.aiModel.baseUrlPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                {t('settingsPage.appearance.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settingsPage.appearance.theme')}</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('settingsPage.appearance.themeSystem')}</SelectItem>
                    <SelectItem value="light">{t('settingsPage.appearance.themeLight')}</SelectItem>
                    <SelectItem value="dark">{t('settingsPage.appearance.themeDark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settingsPage.appearance.language')}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'zh-CN' | 'en-US')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">{t('settingsPage.appearance.langZhCN')}</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
