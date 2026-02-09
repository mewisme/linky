'use client'

import { IconCheck, IconLoader2, IconPencil, IconTags } from '@tabler/icons-react'
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
import { useEffect, useState, useTransition } from 'react'

import { Badge } from '@ws/ui/components/ui/badge'
import { Button } from '@ws/ui/components/ui/button'
import type { ResourcesAPI } from '@/types/resources.types'
import type { UserDetails } from '@/stores/user-store'
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

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

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/resources/interest-tags?limit=200')
        if (!res.ok) throw new Error(await res.text() || res.statusText)
        const json = (await res.json()) as ResourcesAPI.InterestTags.Get.Response
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconTags className="size-4" />
          <span>Interests</span>
        </div>
        {!editingTags && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingTags(true)}
          >
            <IconPencil className="size-4" />
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
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {selectedTags.map((tag) => (
                  <Tooltip key={tag.id}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="px-3 py-1.5 text-sm flex items-center gap-2 cursor-default"
                      >
                        <span className="text-base" aria-hidden="true">
                          {tag.icon || '🏷️'}
                        </span>
                        <span>{tag.name}</span>
                        {tag.category && (
                          <span className="text-xs text-muted-foreground ml-1">
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No interests selected
            </p>
          )}
        </>
      )}
    </div>
  )
}
