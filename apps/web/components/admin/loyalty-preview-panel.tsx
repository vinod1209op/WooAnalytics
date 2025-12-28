import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  previewCustomer,
  highlights,
  loopSteps,
  earnRules,
  streakIdeas,
  rewardLadder,
  rewardVault,
  messageIdeas,
  surfaces,
  interactionPlaybook,
  ideaBank,
} from '@/lib/loyalty-preview';

export function LoyaltyPreviewPanel() {
  const percent = Math.min(
    100,
    Math.round((previewCustomer.points / previewCustomer.nextRewardAt) * 100)
  );

  return (
    <div className="space-y-6">
      <Card className="border-[#d9c7f5] bg-white/80 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Admin</Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
            Points + Rewards
          </CardTitle>
          <CardDescription className="text-[#6f4bb3] dark:text-purple-200/80">
            Built around existing Woo products and coupons.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
                >
                  <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                    {item.title}
                  </div>
                  <div className="text-xs">{item.detail}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Gameplay loop
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                {loopSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-lg border border-[#f0e5ff] bg-white/70 p-2"
                  >
                    <div className="text-sm font-semibold text-[#5b3ba4] dark:text-purple-100">
                      {step.title}
                    </div>
                    <div className="text-[11px] text-slate-500">{step.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#eadcff] bg-white/80 p-4 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer snapshot
            </div>
            <div className="mt-2 text-lg font-semibold text-[#5b3ba4] dark:text-purple-100">
              {previewCustomer.name}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>
                Level:{' '}
                <Badge className="bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50">
                  {previewCustomer.level}
                </Badge>
              </span>
              <span>
                {previewCustomer.points} / {previewCustomer.nextRewardAt} pts
              </span>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-[#f4ecff] shadow-inner dark:bg-purple-900/40">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-[#b892ff] via-[#8e63f1] to-[#6f4bb3]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-3 rounded-lg border border-[#f0e5ff] bg-white/70 p-2 text-xs text-slate-500">
              Last points: {previewCustomer.lastEarned}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Next reward: {previewCustomer.nextRewardLabel}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              How points are earned
            </CardTitle>
            <CardDescription>Simple rules, easy to explain.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {earnRules.map((rule) => (
              <div
                key={rule.label}
                className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
              >
                <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                  {rule.label}
                </div>
                <div className="text-xs">{rule.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              Streaks + boosters
            </CardTitle>
            <CardDescription>Momentum without discounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {streakIdeas.map((idea) => (
              <div
                key={idea.label}
                className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
              >
                <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                  {idea.label}
                </div>
                <div className="text-xs">{idea.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              Reward ladder
            </CardTitle>
            <CardDescription>Only uses current Woo products and coupons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rewardLadder.map((reward) => (
              <div
                key={reward.points}
                className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                    {reward.title}
                  </div>
                  <Badge className="bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50">
                    {reward.points} pts
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">{reward.source}</div>
                <div className="text-xs">{reward.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              Reward vault
            </CardTitle>
            <CardDescription>Existing items and coupons we can use.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {rewardVault.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-[#eadcff] bg-white/80 px-3 py-2 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              Messages
            </CardTitle>
            <CardDescription>Short, clear reward moments.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {messageIdeas.map((note) => (
              <div
                key={note.title}
                className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
              >
                <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                  {note.title}
                </div>
                <div className="text-xs">{note.body}</div>
                <div className="mt-2 text-[11px] text-slate-500">Channel: {note.channel}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
          <CardHeader>
            <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
              Where it shows up
            </CardTitle>
            <CardDescription>Visibility is the whole game.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-200">
            {surfaces.map((item) => (
              <div key={item} className="rounded-lg border border-[#eadcff] bg-white/80 px-3 py-2">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
        <CardHeader>
          <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
            Interaction playbook
          </CardTitle>
          <CardDescription>Tags that trigger GHL workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {interactionPlaybook.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-[#eadcff] bg-white/80 px-3 py-2 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#eadcff] bg-white/70 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
        <CardHeader>
          <CardTitle className="text-lg text-[#5b3ba4] dark:text-purple-100">
            Idea bank
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ideaBank.map((idea) => (
            <div
              key={idea.title}
              className="rounded-xl border border-[#eadcff] bg-white/80 p-3 text-sm text-slate-600 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200"
            >
              <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                {idea.title}
              </div>
              <div className="text-xs">{idea.detail}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
