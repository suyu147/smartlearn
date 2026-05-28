'use client';

import Link from 'next/link';
import {
  BookOpen,
  GitBranch,
  MessageSquare,
  Route,
  Settings,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: MessageSquare,
    title: '对话式画像构建',
    description: '通过多轮对话智能抽取学习特征，构建8维度学习画像',
    href: '/profile',
    color: 'text-violet-500',
    badge: '核心功能',
  },
  {
    icon: Sparkles,
    title: '多智能体资源生成',
    description: '7个专业Agent协同生成6种个性化学习资源',
    href: '/resources',
    color: 'text-cyan-500',
    badge: '核心功能',
  },
  {
    icon: Route,
    title: '个性化学习路径',
    description: '动态规划学习路径，精准推荐资源，随学随新',
    href: '/learning-path',
    color: 'text-orange-500',
    badge: '核心功能',
  },
  {
    icon: GraduationCap,
    title: '智能辅导',
    description: '多模态答疑解惑，文字+图解+视频全方位辅导',
    href: '/tutor',
    color: 'text-teal-500',
    badge: '加分功能',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SmartLearn</span>
            <Badge variant="secondary" className="ml-2">
              A3 赛题
            </Badge>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <MessageSquare className="mr-1 h-4 w-4" />
                画像
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" size="sm">
                <Sparkles className="mr-1 h-4 w-4" />
                资源
              </Button>
            </Link>
            <Link href="/learning-path">
              <Button variant="ghost" size="sm">
                <Route className="mr-1 h-4 w-4" />
                路径
              </Button>
            </Link>
            <Link href="/tutor">
              <Button variant="ghost" size="sm">
                <GraduationCap className="mr-1 h-4 w-4" />
                辅导
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="container flex flex-1 flex-col items-center justify-center gap-8 py-24 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            基于大模型的
            <span className="text-primary">个性化学习</span>
            <br />
            多智能体系统
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            通过多智能体协作，为您构建精准学习画像，生成个性化学习资源，
            规划动态学习路径，实现真正的因材施教
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/profile">
            <Button size="lg" className="gap-2">
              <MessageSquare className="h-5 w-5" />
              开始构建画像
            </Button>
          </Link>
          <Link href="/resources">
            <Button size="lg" variant="outline" className="gap-2">
              <Sparkles className="h-5 w-5" />
              生成学习资源
            </Button>
          </Link>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    <Badge variant={feature.badge === '核心功能' ? 'default' : 'secondary'}>
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              多智能体架构
            </CardTitle>
            <CardDescription>
              7个专业Agent + 1个编排器，基于LangGraph状态机协同工作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { name: '画像Agent', desc: '对话构建画像', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
                { name: '文档Agent', desc: '生成讲解文档', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
                { name: '题库Agent', desc: '生成练习题', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                { name: '多模态Agent', desc: '思维导图/视频', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
                { name: '代码Agent', desc: '代码实操案例', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                { name: '路径Agent', desc: '规划学习路径', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                { name: '辅导Agent', desc: '智能辅导答疑', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                { name: '评估Agent', desc: '学习效果评估', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className={`rounded-lg p-3 text-center ${agent.color}`}
                >
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-xs opacity-80">{agent.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>SmartLearn — 第十五届&ldquo;中国软件杯&rdquo;大学生软件设计大赛 A3 赛题</p>
      </footer>
    </div>
  );
}
