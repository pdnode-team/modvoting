import Candidate from '#models/candidate'
import Round from '#models/round'
import User from '#models/user'
import { LevelGuardService } from './level_guard_service.js'
import { electionConfig } from '#config/elections'

export class CampaignClosedError extends Error {}
export class AlreadyAppliedError extends Error {}
export class CampaignFullError extends Error {}
export class QuestionnaireError extends Error {}
export class NotVerifiedError extends Error {}

export interface CampaignAnswers {
  months: number
  /** key = 上届版主名（配置化） */
  opinions: Record<string, string>
}

/**
 * 竞选报名：Titanium+ 自动批准，须填写问卷（成员时长 + 对每位上届版主的评价）。
 * 竞选池上限 10 人（报名即占名额）。
 */
export class CampaignService {
  constructor(
    private readonly guard: LevelGuardService,
    private readonly previousModerators: readonly { name: string; zulipId: number }[] = electionConfig.previousModerators,
    private readonly maxCandidates: number = electionConfig.maxCandidates
  ) {}

  async apply(user: User, round: Round, answers: CampaignAnswers): Promise<Candidate> {
    if (round.status !== 'campaigning') {
      throw new CampaignClosedError('Campaigning phase is closed')
    }
    if (!user.zulipUserId) {
      throw new NotVerifiedError('Email not verified / no Zulip identity bound')
    }

    await this.guard.assertLevel(user.zulipUserId, 'titanium')
    this.#validateQuestionnaire(answers)

    const existing = await Candidate.query()
      .where('userId', user.id)
      .where('roundId', round.id)
      .first()
    if (existing) {
      throw new AlreadyAppliedError('Already applied for this round')
    }

    const [{ $extras }] = await Candidate.query()
      .where('roundId', round.id)
      .count('* as c')
    if (Number($extras.c) >= this.maxCandidates) {
      throw new CampaignFullError('Campaign pool is full')
    }

    return Candidate.create({
      userId: user.id,
      roundId: round.id,
      status: 'approved',
      answers: JSON.stringify({ months: answers.months, opinions: answers.opinions }),
    })
  }

  parseAnswers(candidate: Candidate): CampaignAnswers {
    return JSON.parse(candidate.answers) as CampaignAnswers
  }

  #validateQuestionnaire(answers: CampaignAnswers): void {
    if (!Number.isInteger(answers.months) || answers.months <= 0) {
      throw new QuestionnaireError('months must be a positive integer')
    }
    for (const moderator of this.previousModerators) {
      const opinion = answers.opinions?.[moderator.name]
      if (typeof opinion !== 'string' || !opinion.trim()) {
        throw new QuestionnaireError(`Opinion about ${moderator.name} is required`)
      }
    }
  }
}
