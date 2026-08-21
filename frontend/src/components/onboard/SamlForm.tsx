import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRef, useState } from 'react';
import { samlOnboardSchema, type SamlOnboardFormValues } from '../../lib/schemas';
import { useSigningKeys } from '../../hooks/useCatalog';
import { useOnboardSaml } from '../../hooks/useOnboard';
import { ErrorBanner } from '../ErrorBanner';
import { normalizeApiError } from '../../lib/httpClient';
import type { AcsBinding, NameIdFormat, SamlOnboardResponse } from '../../types/api';

const ACS_BINDINGS: AcsBinding[] = ['POST', 'Redirect'];
const NAME_ID_FORMATS: NameIdFormat[] = ['emailAddress', 'unspecified', 'persistent', 'transient'];

interface SamlFormProps {
  onSuccess: (result: SamlOnboardResponse) => void;
}

/**
 * Best-effort client-side metadata "parse" for prefill: this is a UX
 * convenience only, it extracts a few common attributes from pasted/uploaded
 * SP metadata XML so the admin can review/edit before final submit. The
 * final POST /api/onboard/saml still sends the full form + raw metadataXml,
 * so the backend is the source of truth.
 */
function parseMetadataForPrefill(xml: string): Partial<SamlOnboardFormValues> {
  const result: Partial<SamlOnboardFormValues> = {};
  const entityIdMatch = xml.match(/entityID=["']([^"']+)["']/);
  if (entityIdMatch) result.partnerEntityId = entityIdMatch[1];

  const acsMatch = xml.match(
    /AssertionConsumerService[^>]*Binding=["'][^"']*(POST|Redirect)["'][^>]*Location=["']([^"']+)["']/i,
  );
  if (acsMatch) {
    result.acsUrl = acsMatch[2];
    result.acsBinding = /post/i.test(acsMatch[1]) ? 'POST' : 'Redirect';
  }

  const sloMatch = xml.match(/SingleLogoutService[^>]*Location=["']([^"']+)["']/);
  if (sloMatch) result.sloEndpoint = sloMatch[1];

  return result;
}

export function SamlForm({ onSuccess }: SamlFormProps) {
  const { data: signingKeys, isLoading: keysLoading } = useSigningKeys();
  const onboardMutation = useOnboardSaml();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SamlOnboardFormValues>({
    resolver: zodResolver(samlOnboardSchema),
    defaultValues: {
      partnerEntityId: '',
      connectionName: '',
      acsUrl: '',
      acsBinding: 'POST',
      sloEndpoint: '',
      metadataXml: '',
      nameIdFormat: 'emailAddress',
      attributeContract: [],
      spSigningCert: '',
      pfSigningKeyPairRef: '',
      requireMfa: false,
    },
  });

  const attributeContract = watch('attributeContract');
  const metadataXml = watch('metadataXml');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue('metadataXml', String(reader.result ?? ''), { shouldValidate: true });
    };
    reader.readAsText(file);
  }

  function handleParseMetadata() {
    const xml = getValues('metadataXml');
    if (!xml) {
      setParseNotice('Paste or upload metadata XML first.');
      return;
    }
    const prefill = parseMetadataForPrefill(xml);
    const fields = Object.keys(prefill) as (keyof SamlOnboardFormValues)[];
    if (fields.length === 0) {
      setParseNotice('Could not extract any fields from the provided metadata. Please fill the form manually.');
      return;
    }
    fields.forEach((key) => {
      setValue(key, prefill[key] as never, { shouldValidate: true });
    });
    setParseNotice(`Prefilled ${fields.length} field(s) from metadata. Review before submitting.`);
  }

  function addAttribute() {
    setValue('attributeContract', [...attributeContract, { source: '', samlAttributeName: '' }]);
  }

  function removeAttribute(index: number) {
    setValue(
      'attributeContract',
      attributeContract.filter((_, i) => i !== index),
    );
  }

  function updateAttribute(index: number, key: 'source' | 'samlAttributeName', value: string) {
    const next = attributeContract.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    setValue('attributeContract', next, { shouldValidate: true });
  }

  const onSubmit = handleSubmit((values) => {
    onboardMutation.mutate(
      {
        ...values,
        sloEndpoint: values.sloEndpoint || undefined,
        metadataXml: values.metadataXml || undefined,
        spSigningCert: values.spSigningCert || undefined,
      },
      { onSuccess },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {onboardMutation.isError && <ErrorBanner {...normalizeApiError(onboardMutation.error)} />}

      <div className="rounded-md border border-slate-200 p-3">
        <label className="block text-sm font-medium text-slate-700">
          Partner metadata XML <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          {...register('metadataXml')}
          rows={5}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
          placeholder="<EntityDescriptor ...>...</EntityDescriptor>"
        />
        <div className="mt-2 flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xml" onChange={handleFileUpload} className="text-sm" />
          <button
            type="button"
            onClick={handleParseMetadata}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Parse metadata
          </button>
        </div>
        {parseNotice && <p className="mt-2 text-xs text-slate-600">{parseNotice}</p>}
        {!metadataXml && (
          <p className="mt-1 text-xs text-slate-400">
            Paste or upload SP metadata, then click "Parse metadata" to prefill fields below. You
            can still edit everything before submitting.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Connection name</label>
        <input {...register('connectionName')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        {errors.connectionName && <p className="mt-1 text-xs text-red-600">{errors.connectionName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Partner entity ID</label>
        <input {...register('partnerEntityId')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        {errors.partnerEntityId && <p className="mt-1 text-xs text-red-600">{errors.partnerEntityId.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">ACS URL</label>
          <input {...register('acsUrl')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          {errors.acsUrl && <p className="mt-1 text-xs text-red-600">{errors.acsUrl.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">ACS binding</label>
          <select {...register('acsBinding')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            {ACS_BINDINGS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          SLO endpoint <span className="text-slate-400">(optional)</span>
        </label>
        <input {...register('sloEndpoint')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        {errors.sloEndpoint && <p className="mt-1 text-xs text-red-600">{errors.sloEndpoint.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Name ID format</label>
        <select {...register('nameIdFormat')} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
          {NAME_ID_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Attribute contract</label>
        <div className="mt-2 space-y-2">
          {attributeContract.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={row.source}
                onChange={(e) => updateAttribute(index, 'source', e.target.value)}
                placeholder="Source (e.g. LDAP attribute)"
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={row.samlAttributeName}
                onChange={(e) => updateAttribute(index, 'samlAttributeName', e.target.value)}
                placeholder="SAML attribute name"
                className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="rounded border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAttribute}
            className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            + Add attribute
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          SP signing certificate <span className="text-slate-400">(optional, PEM)</span>
        </label>
        <textarea
          {...register('spSigningCert')}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">PF signing key pair</label>
        <select
          {...register('pfSigningKeyPairRef')}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          disabled={keysLoading}
        >
          <option value="">{keysLoading ? 'Loading...' : 'Select...'}</option>
          {signingKeys?.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        {errors.pfSigningKeyPairRef && (
          <p className="mt-1 text-xs text-red-600">{errors.pfSigningKeyPairRef.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" {...register('requireMfa')} />
          Require MFA
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Requires a platform admin's PingOne connection to already exist. If the PingOne
          connection is not configured (see Platform status), enabling this will fail at
          submission time.
        </p>
      </div>

      <button
        type="submit"
        disabled={onboardMutation.isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {onboardMutation.isPending ? 'Creating...' : 'Create SAML connection'}
      </button>
    </form>
  );
}
