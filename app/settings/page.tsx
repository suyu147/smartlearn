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

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <div className="container max-w-2xl flex-1 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">设置</h1>
          <p className="text-muted-foreground">配置AI模型和系统参数</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                AI 模型配置
              </CardTitle>
              <CardDescription>配置大语言模型提供商和密钥</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>提供商</Label>
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spark">讯飞星火（推荐）</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="kimi">Kimi</SelectItem>
                    <SelectItem value="qwen">通义千问</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>模型</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerId === 'spark' && (
                      <>
                        <SelectItem value="lite">星火 Lite</SelectItem>
                        <SelectItem value="generalv3">星火 Pro</SelectItem>
                        <SelectItem value="pro-128k">星火 Pro-128K</SelectItem>
                        <SelectItem value="4.0Ultra">星火 4.0 Ultra</SelectItem>
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
                  placeholder="输入API Key"
                />
              </div>

              {providerId === 'spark' && (
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="输入API Secret（讯飞星火需要）"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>自定义 Base URL（可选）</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="留空使用默认地址"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                外观
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>主题</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">跟随系统</SelectItem>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>语言</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'zh-CN' | 'en-US')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
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
