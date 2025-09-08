'use client';
import { CollectionViewStatusEnum } from '@/api';
import { FormatDate } from '@/components/format-date';
import { PageContent } from '@/components/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import _ from 'lodash';

import { useCollectionContext } from '@/components/providers/collection-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api/client';
import {
  ArrowLeft,
  Calendar,
  EllipsisVertical,
  Files,
  FlaskConical,
  History,
  MailQuestionMark,
  Settings,
  Trash,
  VectorSquare,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { CollectionDelete } from './collection-delete';

export const CollectionHeader = ({ className }: { className?: string }) => {
  const badgeColor: {
    [key in CollectionViewStatusEnum]: string;
  } = {
    ACTIVE: 'bg-green-700',
    INACTIVE: 'bg-red-500',
    DELETED: 'bg-gray-500',
  };
  const { collection, share, loadShare } = useCollectionContext();
  const pathname = usePathname();
  const page_collections = useTranslations('page_collections');
  const page_documents = useTranslations('page_documents');
  const page_graph = useTranslations('page_graph');
  const page_evaluation = useTranslations('page_evaluation');

  const urls = useMemo(() => {
    return {
      documents: `/workspace/collections/${collection.id}/documents`,
      search: `/workspace/collections/${collection.id}/search`,
      graph: `/workspace/collections/${collection.id}/graph`,
      settings: `/workspace/collections/${collection.id}/settings`,
    };
  }, [collection.id]);

  const shareCollection = useCallback(
    async (checked: boolean) => {
      if (!collection?.id) {
        return;
      }
      if (checked) {
        await apiClient.defaultApi.collectionsCollectionIdSharingPost({
          collectionId: collection?.id,
        });
        toast.success(page_collections('published_success'));
      } else {
        await apiClient.defaultApi.collectionsCollectionIdSharingDelete({
          collectionId: collection?.id,
        });
        toast.success(page_collections('unpublished_success'));
      }
      await loadShare();
    },
    [collection?.id, loadShare, page_collections],
  );

  return (
    <PageContent className={cn('flex flex-col gap-4 pb-0', className)}>
      <Card className="gap-0 p-0">
        <CardHeader className="p-4">
          <div className='flex flex-row gap-2 items-center'>
            <Button variant="ghost" asChild>
              <Link href="/workspace/collections">
                <ArrowLeft />
              </Link>
            </Button>
          <CardTitle className="text-2xl">{collection.title}</CardTitle>
          </div>
          <CardDescription className="flex flex-row items-center gap-6">
            <div>
              {collection.created && (
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Calendar className="size-3" />
                  <FormatDate datetime={new Date(collection.created)} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-2 rounded-2xl',
                  collection.status
                    ? badgeColor[collection.status]
                    : 'bg-gray-500',
                )}
              />
              <div className="text-muted-foreground text-sm">
                {_.upperFirst(_.lowerCase(collection.status))}
              </div>
            </div>
          </CardDescription>
          <CardAction className="flex flex-row items-center gap-4">
            {share && (
              <Badge variant={share.is_published ? 'default' : 'secondary'}>
                {share.is_published
                  ? page_collections('public')
                  : page_collections('private')}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {share && (
                  <>
                    {share.is_published ? (
                      <DropdownMenuItem
                        className="flex-col items-start gap-1"
                        onClick={() => shareCollection(false)}
                      >
                        <div>{page_collections('unpublish_collection')}</div>
                        <div className="text-muted-foreground text-xs">
                          {page_collections('unpublish_collection_description')}
                        </div>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="flex-col items-start gap-1"
                        onClick={() => shareCollection(true)}
                      >
                        <div>{page_collections('publish_collection')}</div>
                        <div className="text-muted-foreground text-xs">
                          {page_collections('publish_collection_description')}
                        </div>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}

                <CollectionDelete>
                  <DropdownMenuItem variant="destructive">
                    <Trash /> {page_collections('delete_collection')}
                  </DropdownMenuItem>
                </CollectionDelete>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardDescription className="mb-4 px-4">
          {_.truncate(
            collection.description ||
              page_collections('no_description_available'),
            {
              length: 180,
            },
          )}
        </CardDescription>
        <Separator />
        <div className="bg-accent/50 flex flex-row gap-2 rounded-b-xl px-4">
          <Button
            asChild
            data-active={Boolean(pathname.match(urls.documents))}
            className="hover:border-b-primary data-[active=true]:border-b-primary h-10 rounded-none border-y-2 border-y-transparent px-1 has-[>svg]:px-2"
            variant="ghost"
          >
            <Link href={urls.documents}>
              <Files />
              <span className="hidden sm:inline">
                {page_documents('metadata.title')}
              </span>
            </Link>
          </Button>

          {collection.config?.enable_knowledge_graph && (
            <Button
              asChild
              data-active={Boolean(pathname.match(urls.graph))}
              className="hover:border-b-primary data-[active=true]:border-b-primary h-10 rounded-none border-y-2 border-y-transparent px-1 has-[>svg]:px-2"
              variant="ghost"
            >
              <Link href={urls.graph}>
                <VectorSquare />
                <span className="hidden sm:inline">
                  {page_graph('metadata.title')}
                </span>
              </Link>
            </Button>
          )}

          {/* <Button
            asChild
            data-active={Boolean(pathname.match(urls.search))}
            className="hover:border-b-primary data-[active=true]:border-b-primary h-10 rounded-none border-y-2 border-y-transparent px-1 has-[>svg]:px-2"
            variant="ghost"
          >
            <Link href={urls.search}>
              <FolderSearch />
              <span className="hidden sm:inline">
                {page_search('metadata.title')}
              </span>
            </Link>
          </Button> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                data-active={Boolean(pathname.match(/(evaluations|questions)/))}
                className="hover:border-b-primary data-[active=true]:border-b-primary h-10 rounded-none border-y-2 border-y-transparent px-1 focus-visible:border-transparent focus-visible:ring-0 has-[>svg]:px-2"
              >
                <FlaskConical /> {page_evaluation('metadata.title')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-45">
              <DropdownMenuItem asChild>
                <Link
                  href={`/workspace/collections/${collection.id}/evaluations`}
                >
                  <History /> {page_evaluation('evaluation_history')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/workspace/collections/${collection.id}/questions`}
                >
                  <MailQuestionMark /> {page_evaluation('question_set')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            data-active={Boolean(pathname.match(urls.settings))}
            className="hover:border-b-primary data-[active=true]:border-b-primary h-10 rounded-none border-y-2 border-y-transparent px-1 has-[>svg]:px-2"
            variant="ghost"
          >
            <Link href={urls.settings}>
              <Settings />{' '}
              <span className="hidden sm:inline">
                {page_collections('settings')}
              </span>
            </Link>
          </Button>
        </div>
      </Card>
    </PageContent>
  );
};
