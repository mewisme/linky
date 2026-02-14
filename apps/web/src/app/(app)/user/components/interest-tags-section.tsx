'use client'

import { FIELD_LABELS, useProfileEdit } from '@/components/context-menu/profile/profile-edit-context'
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconTags,
} from '@tabler/icons-react'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@ws/ui/components/kibo-ui/tags'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ws/ui/components/ui/tooltip'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Badge } from '@ws/ui/components/ui/badge'
import { Button } from '@ws/ui/components/ui/button'
import type { ResourcesAPI } from '@/types/resources.types'
import type { UserDetails } from '@/stores/user-store'
import { apiUrl } from '@/lib/api/fetch/api-url'
import { fetchData } from '@/lib/api/fetch/client-api'
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

const INITIAL_TAGS_VISIBLE = 6

interface InterestTagsSectionProps {
  userDetails: UserDetails | null
  updateUserDetails: (data: {
    interest_tags?: string[] | null
  }) => Promise<UserDetails>
}

export function InterestTagsSection({
  userDetails,
  updateUserDetails,
}: InterestTagsSectionProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [editingTags, setEditingTags] = useState(false)
  const [availableTags, setAvailableTags] = useState<ResourcesAPI.InterestTags.InterestTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const params = new URLSearchParams({ limit: '200' })
        const json = await fetchData<ResourcesAPI.InterestTags.Get.Response>(
          apiUrl.resources.interestTags(params)
        )
        setAvailableTags(json.data)
      } catch (error) {
        console.error('Failed to fetch interest tags:', error)
      }
    }
    fetchTags()
  }, [])

  useEffect(() => {
    if (userDetails?.interest_tags) {
      setSelectedTagIds(
        userDetails.interest_tags
          .filter((tag) => tag.is_active)
          .map((tag) => tag.id)
      )
    }
  }, [userDetails])

  const profileEdit = useProfileEdit()
  const profileEditRef = useRef(profileEdit)
  profileEditRef.current = profileEdit
  useEffect(() => {
    const ctx = profileEditRef.current
    if (!ctx) return
    ctx.register('interestTags', FIELD_LABELS.interestTags, () => setEditingTags(true))
    return () => profileEditRef.current?.unregister('interestTags')
  }, [])

  const handleUpdateTags = () => {
    startTransition(async () => {
      try {
        await updateUserDetails({ interest_tags: selectedTagIds })
        playSound('success')
        toast.success('Interest tags updated')
        setEditingTags(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const selectedTags = availableTags.filter((tag) =>
    selectedTagIds.includes(tag.id)
  )

  const getTagSearchValue = (tag: ResourcesAPI.InterestTags.InterestTag) => {
    return `${tag.name} ${tag.description || ''} ${tag.category || ''}`.trim()
  }

  const showToggle =
    !editingTags &&
    selectedTags.length > INITIAL_TAGS_VISIBLE

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 py-0.5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconTags className="size-4 shrink-0" aria-hidden />
          <span>Interests</span>
        </div>
        {showToggle && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-1.5 text-muted-foreground"
            onClick={() => setShowAllTags((prev) => !prev)}
          >
            {showAllTags ? (
              <>
                <IconChevronUp className="size-4 mr-1 shrink-0" />
                Show less
              </>
            ) : (
              <>
                <IconChevronDown className="size-4 mr-1 shrink-0" />
                More ({selectedTags.length - INITIAL_TAGS_VISIBLE})
              </>
            )}
          </Button>
        )}
      </div>

      {editingTags ? (
        <div className="space-y-3">
          <Tags
            value={searchQuery}
            setValue={setSearchQuery}
          >
            <TagsTrigger>
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <TagsValue
                    key={tag.id}
                    variant="secondary"
                    onRemove={() => toggleTag(tag.id)}
                  >
                    <span className="text-base" aria-hidden="true">
                      {tag.icon || '🏷️'}
                    </span>
                    {tag.name}
                  </TagsValue>
                ))
              ) : null}
            </TagsTrigger>
            <TagsContent>
              <TagsInput placeholder="Search tags..." />
              <TagsList>
                <TagsEmpty>No tags found.</TagsEmpty>
                <TagsGroup>
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <TagsItem
                        key={tag.id}
                        value={getTagSearchValue(tag)}
                        onSelect={() => toggleTag(tag.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-base" aria-hidden="true">
                            {tag.icon || '🏷️'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{tag.name}</div>
                            {tag.description && (
                              <div className="text-xs text-muted-foreground">
                                {tag.description}
                              </div>
                            )}
                            {tag.category && (
                              <div className="text-xs text-muted-foreground">
                                {tag.category}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <IconCheck className="size-4 text-primary" />
                          )}
                        </div>
                      </TagsItem>
                    )
                  })}
                </TagsGroup>
              </TagsList>
            </TagsContent>
          </Tags>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedTagIds(
                  userDetails?.interest_tags
                    ?.filter((tag) => tag.is_active)
                    .map((tag) => tag.id) || []
                )
                setEditingTags(false)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateTags}
              disabled={isPending}
            >
              {isPending && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {selectedTags.length > 0 ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 sm:px-4 sm:py-3">
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    {(showAllTags
                      ? selectedTags
                      : selectedTags.slice(0, INITIAL_TAGS_VISIBLE)
                    ).map((tag) => (
                      <Tooltip key={tag.id}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="cursor-default px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm"
                          >
                            <span className="mr-1.5 text-base leading-none" aria-hidden>
                              {tag.icon || '🏷️'}
                            </span>
                            <span>{tag.name}</span>
                            {tag.category && (
                              <span className="ml-1 hidden text-muted-foreground sm:inline">
                                ({tag.category})
                              </span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        {tag.description && (
                          <TooltipContent>
                            <p className="max-w-xs">{tag.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:px-5 sm:py-4">
              No interests selected
            </p>
          )}
        </>
      )}
    </div>
  )
}
