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
import { useI18n } from '@/lib/hooks/use-i18n';

export default function HomePage() {
  const { t } = useI18n();

  const features = [
    {
      icon: MessageSquare,
      title: t('home.features.profile.title'),
      description: t('home.features.profile.description'),
      href: '/profile',
      color: 'text-violet-500',
      badge: t('home.badge.core'),
    },
    {
      icon: Sparkles,
      title: t('home.features.resource.title'),
      description: t('home.features.resource.description'),
      href: '/resources',
      color: 'text-cyan-500',
      badge: t('home.badge.core'),
    },
    {
      icon: Route,
      title: t('home.features.path.title'),
      description: t('home.features.path.description'),
      href: '/learning-path',
      color: 'text-orange-500',
      badge: t('home.badge.core'),
    },
    {
      icon: GraduationCap,
      title: t('home.features.tutor.title'),
      description: t('home.features.tutor.description'),
      href: '/tutor',
      color: 'text-teal-500',
      badge: t('home.badge.bonus'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SmartLearn</span>
            <Badge variant="secondary" className="ml-2">
              {t('home.contestBadge')}
            </Badge>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <MessageSquare className="mr-1 h-4 w-4" />
                {t('home.nav.profile')}
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" size="sm">
                <Sparkles className="mr-1 h-4 w-4" />
                {t('home.nav.resource')}
              </Button>
            </Link>
            <Link href="/learning-path">
              <Button variant="ghost" size="sm">
                <Route className="mr-1 h-4 w-4" />
                {t('home.nav.path')}
              </Button>
            </Link>
            <Link href="/tutor">
              <Button variant="ghost" size="sm">
                <GraduationCap className="mr-1 h-4 w-4" />
                {t('home.nav.tutor')}
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
            {t('home.hero.line1')}
            <span className="text-primary">{t('home.hero.highlight')}</span>
            <br />
            {t('home.hero.line2')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t('home.hero.subtitle')}
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/profile">
            <Button size="lg" className="gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('home.cta.buildProfile')}
            </Button>
          </Link>
          <Link href="/resources">
            <Button size="lg" variant="outline" className="gap-2">
              <Sparkles className="h-5 w-5" />
              {t('home.cta.generateResource')}
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
                    <Badge variant={feature.badge === t('home.badge.core') ? 'default' : 'secondary'}>
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
              {t('home.architecture.title')}
            </CardTitle>
            <CardDescription>
              {t('home.architecture.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { name: t('home.agents.profile.name'), desc: t('home.agents.profile.desc'), color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
                { name: t('home.agents.document.name'), desc: t('home.agents.document.desc'), color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
                { name: t('home.agents.quiz.name'), desc: t('home.agents.quiz.desc'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                { name: t('home.agents.multimodal.name'), desc: t('home.agents.multimodal.desc'), color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
                { name: t('home.agents.code.name'), desc: t('home.agents.code.desc'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                { name: t('home.agents.path.name'), desc: t('home.agents.path.desc'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                { name: t('home.agents.tutor.name'), desc: t('home.agents.tutor.desc'), color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                { name: t('home.agents.evaluation.name'), desc: t('home.agents.evaluation.desc'), color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' },
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
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}
