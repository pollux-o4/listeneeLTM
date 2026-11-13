import { describe, expect, test } from 'vitest'
import { workingView } from '../src/features/brief/fixtures.ts'
import { stageContent } from '../src/features/brief/stage/stageContent.ts'

// DATA-001: consumers use opaque core-provided relationships, including cross-section choices.
describe('stage content', () => {
  test('finds the selected item in another section without reconstructing its id', () => {
    const source = workingView.brief.sections.constraints?.find(
      (item) => item.id === workingView.decisionItems['image-host'],
    )
    if (!source) throw new Error('Missing selected fixture item')
    const derived = { ...source, id: 'opaque-item-id' }
    const plain = { ...source, id: 'decision-ordinary-item' }
    const view = {
      ...workingView,
      decisionItems: { ...workingView.decisionItems, 'image-host': derived.id },
      brief: {
        ...workingView.brief,
        sections: {
          ...workingView.brief.sections,
          constraints: [plain],
          scopeOut: [derived],
        },
      },
    }
    const stage = stageContent(view, 'constraints')
    expect(stage.decisions.find(({ decision }) => decision.id === 'image-host')?.derived).toBe(
      derived,
    )
    expect(stage.items.map(({ item }) => item.id)).toEqual([plain.id])
    expect(stageContent(view, 'scopeOut').items).toEqual([])
  })

  test('presents open choices before chosen and dormant choices using core status', () => {
    const view = {
      ...workingView,
      brief: {
        ...workingView.brief,
        decisions: workingView.brief.decisions.map((decision) => ({
          ...decision,
          section: 'constraints' as const,
        })),
      },
    }
    expect(stageContent(view, 'constraints').decisions.map(({ decision }) => decision.id)).toEqual([
      'done-bar',
      'zoom',
      'image-host',
      'zoom-open',
    ])
  })
})
