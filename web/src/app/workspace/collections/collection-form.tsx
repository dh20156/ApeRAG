'use client';

import { ModelSpec } from '@/api';
import { useCollectionContext } from '@/components/providers/collection-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { cn, objectKeys } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import _ from 'lodash';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const collectionModelSchema = z
  .object({
    custom_llm_provider: z.string(),
    model: z.string(),
    model_service_provider: z.string(),
  })
  .optional();

const collectionSchema = z
  .object({
    title: z.string().min(1),
    description: z.string(),
    type: z.enum(['document']),
    config: z.object({
      source: z.enum(['anybase']),
      enable_fulltext: z.boolean(),
      enable_knowledge_graph: z.boolean(),
      enable_summary: z.boolean(),
      enable_vector: z.boolean(),
      enable_vision: z.boolean(),
      completion: collectionModelSchema,
      embedding: collectionModelSchema,
    }),
  })
  .refine(
    ({ config }) => {
      if (config.enable_vector) {
        return !_.isEmpty(config.embedding?.model);
      }
      return true;
    },
    {
      path: ['config.embedding.model'],
    },
  )
  .refine(
    ({ config }) => {
      if (
        config.enable_knowledge_graph ||
        config.enable_summary ||
        config.enable_vision
      ) {
        return !_.isEmpty(config.completion?.model);
      }
      return true;
    },
    {
      path: ['config.completion.model'],
    },
  );

type FormValueType = z.infer<typeof collectionSchema>;

const defaultValues: FormValueType = {
  title: '',
  description: '',
  type: 'document',
  config: {
    source: 'anybase',
    enable_fulltext: true,
    enable_knowledge_graph: true,
    enable_vector: true,
    enable_summary: false,
    enable_vision: false,
    completion: {
      custom_llm_provider: '',
      model: '',
      model_service_provider: '',
    },
    embedding: {
      custom_llm_provider: '',
      model: '',
      model_service_provider: '',
    },
  },
};

export type ProviderModel = {
  label?: string;
  name?: string;
  models?: ModelSpec[];
};

export const CollectionForm = ({ action }: { action: 'add' | 'edit' }) => {
  const router = useRouter();
  const { collection, loadCollection } = useCollectionContext();
  const [completionModels, setCompletionModels] = useState<ProviderModel[]>();
  const [embeddingModels, setEmbeddingModels] = useState<ProviderModel[]>();

  const common_tips = useTranslations('common.tips');
  const common_action = useTranslations('common.action');
  const page_collections = useTranslations('page_collections');

  const CollectionConfigIndexTypes = {
    'config.enable_vector': {
      disabled: true,
      title: page_collections('index_type_VECTOR.title'),
      description: page_collections('index_type_VECTOR.description'),
    },
    'config.enable_fulltext': {
      disabled: true,
      title: page_collections('index_type_FULLTEXT.title'),
      description: page_collections('index_type_FULLTEXT.description'),
    },
    'config.enable_knowledge_graph': {
      disabled: false,
      title: page_collections('index_type_GRAPH.title'),
      description: page_collections('index_type_GRAPH.description'),
    },
    'config.enable_summary': {
      disabled: false,
      title: page_collections('index_type_SUMMARY.title'),
      description: page_collections('index_type_SUMMARY.description'),
    },
    'config.enable_vision': {
      disabled: false,
      title: page_collections('index_type_VISION.title'),
      description: page_collections('index_type_VISION.description'),
    },
  };

  const form = useForm<FormValueType>({
    resolver: zodResolver(collectionSchema),
    defaultValues:
      action === 'add' ? defaultValues : (collection as FormValueType),
  });

  /**
   * load models by 'enable_for_collection' in tags
   * set completion、embedding models used in model select component
   */
  const loadModels = useCallback(async () => {
    const res = await apiClient.defaultApi.availableModelsPost({
      tagFilterRequest: {
        tag_filters: [{ operation: 'AND', tags: ['enable_for_collection'] }],
      },
    });
    const completion = res.data.items?.map((m) => {
      return {
        label: m.label,
        name: m.name,
        models: m.completion,
      };
    });
    const embedding = res.data.items?.map((m) => {
      return {
        label: m.label,
        name: m.name,
        models: m.embedding,
      };
    });
    setCompletionModels(completion || []);
    setEmbeddingModels(embedding || []);
  }, []);

  /**
   * handle create or update a collection
   */
  const handleCreateOrUpdate = useCallback(
    async (values: FormValueType) => {
      const anybaseInfo = JSON.parse(
        localStorage.getItem('anybase_info') || '{}',
      );

      if (action === 'edit') {
        if (!collection?.id) return;
        const res = await apiClient.defaultApi.collectionsCollectionIdPut({
          collectionId: collection.id,
          collectionUpdate: {
            ...values,
            config: {
              ...values.config,
              source: 'anybase',
              // @ts-expect-error error
              anybase: {
                object_prefix: 'nonono',
                bucket: anybaseInfo.bucket,
              },
            },
          },
        });
        if (res.data.id) {
          toast.success(common_tips('update_success'));
          loadCollection();
        }
      }
      if (action === 'add') {
        const res = await apiClient.defaultApi.collectionsPost({
          collectionCreate: {
            ...values,
            config: {
              ...values.config,
              source: 'anybase',
              // @ts-expect-error error
              anybase: {
                object_prefix: 'nonono',
                bucket: anybaseInfo.bucket,
              },
            },
          },
        });
        if (res.data.id) {
          toast.success(common_tips('create_success'));
          router.push('/workspace/collections');
        }
      }
    },
    [action, collection.id, common_tips, loadCollection, router],
  );

  /**
   * Watch completionModelName
   * When the completion model name is changed, synchronize changes to other model parameters.
   */
  const completionModelName = useWatch({
    control: form.control,
    name: 'config.completion.model',
  });
  useEffect(() => {
    let defaultModel: ModelSpec | undefined;
    let currentModel: ModelSpec | undefined;
    let defaultProvider: ProviderModel | undefined;
    let currentProvider: ProviderModel | undefined;
    completionModels?.forEach((provider) => {
      provider.models?.forEach((m) => {
        if (m.tags?.some((t) => t === 'default_for_collection_completion')) {
          defaultModel = m;
          defaultProvider = provider;
        }
        if (m.model === completionModelName) {
          currentModel = m;
          currentProvider = provider;
        }
      });
    });

    form.setValue(
      'config.completion.custom_llm_provider',
      currentModel?.custom_llm_provider ||
        currentModel?.custom_llm_provider ||
        '',
    );
    form.setValue(
      'config.completion.model_service_provider',
      currentProvider?.name || defaultProvider?.name || '',
    );
    form.setValue(
      'config.completion.model',
      currentModel?.model || defaultModel?.model || '',
    );
  }, [completionModelName, completionModels, form]);

  /**
   * Watch embeddingModelName
   * When the embedding model name is changed, synchronize changes to other model parameters.
   */
  const embeddingModelName = useWatch({
    control: form.control,
    name: 'config.embedding.model',
  });
  useEffect(() => {
    let defaultModel: ModelSpec | undefined;
    let currentModel: ModelSpec | undefined;
    let defaultProvider: ProviderModel | undefined;
    let currentProvider: ProviderModel | undefined;
    embeddingModels?.forEach((provider) => {
      provider.models?.forEach((m) => {
        if (m.tags?.some((t) => t === 'default_for_embedding')) {
          defaultModel = m;
          defaultProvider = provider;
        }
        if (m.model === embeddingModelName) {
          currentModel = m;
          currentProvider = provider;
        }
      });
    });
    form.setValue(
      'config.embedding.custom_llm_provider',
      currentModel?.custom_llm_provider ||
        currentModel?.custom_llm_provider ||
        '',
    );
    form.setValue(
      'config.embedding.model_service_provider',
      currentProvider?.name || defaultProvider?.name || '',
    );
    form.setValue(
      'config.embedding.model',
      currentModel?.model || defaultModel?.model || '',
    );
  }, [embeddingModelName, embeddingModels, form]);

  /**
   * load models
   */
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleCreateOrUpdate)}
          className="flex flex-col gap-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>{page_collections('general')}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{page_collections('name')}</FormLabel>
                    <FormControl>
                      <Input
                        className="md:w-6/12"
                        placeholder={page_collections('name_placeholder')}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{page_collections('description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-38"
                        placeholder={page_collections(
                          'description_placeholder',
                        )}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{page_collections('index_types')}</CardTitle>
              <CardDescription>
                {page_collections('index_types_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {objectKeys(CollectionConfigIndexTypes).map((key) => {
                const item = CollectionConfigIndexTypes[key];
                return (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={cn(
                            'has-[[aria-checked=true]]:bg-accent/50 flex items-center gap-3 rounded-lg border p-3',
                            item.disabled
                              ? 'cursor-not-allowed'
                              : 'hover:bg-accent/30 cursor-pointer',
                          )}
                        >
                          <div className="grid gap-2">
                            <div className="flex items-center gap-2 leading-none font-medium">
                              {item.title}
                              {item.disabled && (
                                <Badge>{page_collections('required')}</Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">
                              {item.description}
                            </p>
                          </div>
                          <FormControl className="ml-auto">
                            <Switch
                              checked={Boolean(field.value)}
                              disabled={item.disabled}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{page_collections('model_settings')}</CardTitle>
              <CardDescription>
                {page_collections('model_settings_description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6 pt-6">
              <FormField
                control={form.control}
                name="config.embedding.model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{page_collections('embedding_model')}</FormLabel>
                    <FormControl className="ml-auto">
                      <Select
                        {...field}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <SelectTrigger className="w-full cursor-pointer md:w-6/12">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {embeddingModels
                            ?.filter((item) => _.size(item.models))
                            .map((item) => {
                              return (
                                <SelectGroup key={item.name}>
                                  <SelectLabel>{item.label}</SelectLabel>
                                  {item.models?.map((model) => {
                                    return (
                                      <SelectItem
                                        key={model.model}
                                        value={model.model || ''}
                                      >
                                        {model.model}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {page_collections('embedding_model_description')}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="config.completion.model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {page_collections('completion_model')}
                    </FormLabel>
                    <FormControl className="ml-auto">
                      <Select
                        {...field}
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <SelectTrigger className="w-full cursor-pointer md:w-6/12">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {completionModels
                            ?.filter((item) => _.size(item.models))
                            .map((item) => {
                              return (
                                <SelectGroup key={item.name}>
                                  <SelectLabel>{item.label}</SelectLabel>
                                  {item.models?.map((model) => {
                                    return (
                                      <SelectItem
                                        key={model.model}
                                        value={model.model || ''}
                                      >
                                        {model.model}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {page_collections('completion_model_description')}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            {action === 'add' && (
              <Button variant="outline" asChild>
                <Link href="/workspace/collections">
                  {common_action('cancel')}
                </Link>
              </Button>
            )}
            <Button type="submit" className="cursor-pointer px-6">
              {action === 'add'
                ? page_collections('create_collection')
                : page_collections('update_collection')}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
