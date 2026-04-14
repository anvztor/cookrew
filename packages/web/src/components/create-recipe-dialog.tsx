'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createRecipe } from '@/lib/api'
import type { Recipe } from '@cookrew/shared'

interface CreateRecipeDialogProps {
  readonly open: boolean
  readonly cookbookId: string
  readonly onClose: () => void
  readonly onCreated: (recipe: Recipe) => void
}

export function CreateRecipeDialog({
  open,
  cookbookId,
  onClose,
  onCreated,
}: CreateRecipeDialogProps) {
  const [name, setName] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [defaultBranch, setDefaultBranch] = useState('main')
  const [createdBy, setCreatedBy] = useState('cookrew@local')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) {
    return null
  }

  async function handleSubmit(formData: FormData) {
    const nextName = String(formData.get('name') ?? '').trim()
    const nextRepoUrl = String(formData.get('repoUrl') ?? '').trim()
    const nextDefaultBranch = String(formData.get('defaultBranch') ?? 'main').trim()
    const nextCreatedBy = String(formData.get('createdBy') ?? '').trim()

    setError(null)
    setIsSubmitting(true)

    try {
      const recipe = await createRecipe({
        name: nextName,
        repo_url: nextRepoUrl,
        default_branch: nextDefaultBranch || 'main',
        created_by: nextCreatedBy,
        cookbook_id: cookbookId,
      })

      setName('')
      setRepoUrl('')
      setDefaultBranch('main')
      onCreated(recipe)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to create recipe.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-recipe-title"
    >
      <div className="page-frame w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border-strong px-5 py-4">
          <div>
            <p className="page-kicker">Cookbook Flow</p>
            <h2 id="create-recipe-title" className="page-title text-[1.5rem]">
              Create Recipe
            </h2>
            <p className="page-copy">
              Start from the cookbook and jump directly into the workspace once
              the recipe exists.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="button-base button-secondary !px-3"
            aria-label="Close create recipe dialog"
          >
            <X size={16} />
          </button>
        </div>

        <form
          action={handleSubmit}
          className="grid gap-4 px-5 py-5 md:grid-cols-2"
        >
          <label className="block">
            <span className="field-label">Recipe Name</span>
            <input
              required
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="text-input"
              placeholder="platform-core"
            />
          </label>

          <label className="block">
            <span className="field-label">Default Branch</span>
            <input
              required
              name="defaultBranch"
              value={defaultBranch}
              onChange={(event) => setDefaultBranch(event.target.value)}
              className="text-input"
              placeholder="main"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="field-label">Repository URL</span>
            <input
              required
              name="repoUrl"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              className="text-input"
              placeholder="git@github.com:krew/platform-core.git"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="field-label">Created By</span>
            <input
              required
              name="createdBy"
              value={createdBy}
              onChange={(event) => setCreatedBy(event.target.value)}
              className="text-input"
              placeholder="cookrew@local"
            />
          </label>

          <div className="panel-muted p-4 md:col-span-2">
            <p className="field-label mb-2">What Happens Next</p>
            <p className="tiny-copy">
              Cookrew creates the recipe, returns the new record, and sends you
              straight to the recipe workspace so bundle orchestration can
              start.
            </p>
          </div>

          {error ? (
            <p className="md:col-span-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="button-row md:col-span-2 md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="button-base button-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-base button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
