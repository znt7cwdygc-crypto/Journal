import {
  agencyIncludeOptions,
  agencyPlatforms,
  audienceOptions,
  parseJson,
  platformLabel,
  studioPlatforms,
  workFormatOptions,
  type Penalty,
  type TeamComposition,
} from "@/lib/directory-labels";

type DirectoryProfileFormValues = {
  name?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  summary?: string;
  description?: string;
  foundedYear?: number | null;
  workFormats?: string[];
  platforms?: string[];
  audiences?: string[];
  city?: string | null;
  district?: string | null;
  landmark?: string | null;
  addressIsPublic?: boolean;
  privateAddress?: string | null;
  roomsCount?: number | null;
  equipment?: string | null;
  livingConditions?: string | null;
  hasAccommodation?: boolean;
  percentMin?: number | null;
  percentMax?: number | null;
  payoutSchedule?: string | null;
  penalties?: string | null;
  teamComposition?: string | null;
  agencySharePercent?: number | null;
  agencyIncludes?: string[];
  modelsCount?: number | null;
  contactLink?: string | null;
  telegramLink?: string | null;
  websiteUrl?: string | null;
};

function CheckboxGroup({ name, options, defaultValues }: { name: string; options: { value: string; label: string }[]; defaultValues: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 has-[:checked]:border-hot has-[:checked]:bg-red-50 has-[:checked]:text-hot">
          <input type="checkbox" name={name} value={opt.value} defaultChecked={defaultValues.includes(opt.value)} className="sr-only" />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function DirectoryProfileForm({
  action,
  type,
  profile,
}: {
  action: (formData: FormData) => void | Promise<void>;
  type: "STUDIO" | "AGENCY";
  profile?: DirectoryProfileFormValues | null;
}) {
  const isStudio = type === "STUDIO";
  const team = parseJson<TeamComposition>(profile?.teamComposition, {});
  const penalties = parseJson<Penalty[]>(profile?.penalties, []);
  const penaltiesText = penalties.map((p) => p.label).join("\n");

  return (
    <form action={action} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <label className="block">
            <span className="form-label">Название организации</span>
            <input className="form-field mt-1 h-10" name="name" defaultValue={profile?.name ?? ""} placeholder={isStudio ? "Например: LunaCam Studio" : "Например: Nord Content Agency"} required />
          </label>
          <label className="block">
            <span className="form-label">Год основания</span>
            <input className="form-field mt-1 h-10" name="foundedYear" type="number" min={2000} max={2030} defaultValue={profile?.foundedYear ?? ""} placeholder="2021" />
          </label>
          <label className="block">
            <span className="form-label">Логотип (URL)</span>
            <input className="form-field mt-1 h-10" name="logoUrl" defaultValue={profile?.logoUrl ?? ""} placeholder="https://..." />
          </label>
          <label className="block">
            <span className="form-label">Обложка (URL)</span>
            <input className="form-field mt-1 h-10" name="coverUrl" defaultValue={profile?.coverUrl ?? ""} placeholder="https://..." />
          </label>
        </div>
      </div>

      <label className="block border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Короткое описание (1-2 строки, показывается в карточке хаба)</span>
        <input className="form-field mt-1 h-10" name="summary" defaultValue={profile?.summary ?? ""} maxLength={240} placeholder="Студия на 14 комнат в центре СПб, работает с Chaturbate и Stripchat" required />
      </label>

      <label className="block border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Полное описание</span>
        <textarea className="form-textarea mt-1 min-h-[110px]" name="description" defaultValue={profile?.description ?? ""} placeholder="О студии, история, специализация, для кого подходит" required />
      </label>

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Формат работы</span>
        <CheckboxGroup name="workFormats" options={workFormatOptions} defaultValues={profile?.workFormats ?? []} />
      </div>

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Платформы</span>
        <CheckboxGroup name="platforms" options={(isStudio ? studioPlatforms : agencyPlatforms).map((v) => ({ value: v, label: platformLabel(v) }))} defaultValues={profile?.platforms ?? []} />
      </div>

      {isStudio && (
        <div className="border-b border-zinc-100 p-3 sm:p-4">
          <span className="form-label">Кого набирают</span>
          <CheckboxGroup name="audiences" options={audienceOptions} defaultValues={profile?.audiences ?? []} />
        </div>
      )}

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
          <label className="block">
            <span className="form-label">Город</span>
            <input className="form-field mt-1 h-10" name="city" defaultValue={profile?.city ?? ""} placeholder="Санкт-Петербург" />
          </label>
          {isStudio && (
            <>
              <label className="block">
                <span className="form-label">Район</span>
                <input className="form-field mt-1 h-10" name="district" defaultValue={profile?.district ?? ""} placeholder="Приморский" />
              </label>
              <label className="block">
                <span className="form-label">Ориентир / метро</span>
                <input className="form-field mt-1 h-10" name="landmark" defaultValue={profile?.landmark ?? ""} placeholder="м. Приморская" />
              </label>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Если формат «Онлайн» — город можно оставить пустым.</p>
      </div>

      {isStudio && (
        <>
          <div className="border-b border-zinc-100 p-3 sm:p-4">
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Точный адрес (приватно)</span>
                <input className="form-field mt-1 h-10" name="privateAddress" defaultValue={profile?.privateAddress ?? ""} placeholder="Виден только модераторам, если не отмечено ниже" />
              </label>
              <label className="mt-1 flex items-center gap-2 self-end pb-2">
                <input type="checkbox" name="addressIsPublic" defaultChecked={profile?.addressIsPublic ?? false} />
                <span className="text-sm text-zinc-700">Показывать точный адрес публично</span>
              </label>
            </div>
          </div>

          <div className="border-b border-zinc-100 p-3 sm:p-4">
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Комнат</span>
                <input className="form-field mt-1 h-10" name="roomsCount" type="number" min={0} max={500} defaultValue={profile?.roomsCount ?? ""} placeholder="14" />
              </label>
              <label className="flex items-center gap-2 self-end pb-2">
                <input type="checkbox" name="hasAccommodation" defaultChecked={profile?.hasAccommodation ?? false} />
                <span className="text-sm text-zinc-700">Есть общежитие / проживание</span>
              </label>
            </div>
            <label className="mt-2 block">
              <span className="form-label">Оборудование</span>
              <textarea className="form-textarea mt-1 min-h-[70px]" name="equipment" defaultValue={profile?.equipment ?? ""} placeholder="Камеры, свет, звук — что есть в комнатах" />
            </label>
            <label className="mt-2 block">
              <span className="form-label">Бытовые условия</span>
              <textarea className="form-textarea mt-1 min-h-[70px]" name="livingConditions" defaultValue={profile?.livingConditions ?? ""} placeholder="Душ, кухня, зона отдыха и т.п." />
            </label>
          </div>

          <div className="border-b border-zinc-100 p-3 sm:p-4">
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
              <label className="block">
                <span className="form-label">Процент модели, от</span>
                <input className="form-field mt-1 h-10" name="percentMin" type="number" min={0} max={100} defaultValue={profile?.percentMin ?? ""} placeholder="50" required />
              </label>
              <label className="block">
                <span className="form-label">Процент модели, до</span>
                <input className="form-field mt-1 h-10" name="percentMax" type="number" min={0} max={100} defaultValue={profile?.percentMax ?? ""} placeholder="65" />
              </label>
              <label className="block">
                <span className="form-label">График выплат</span>
                <input className="form-field mt-1 h-10" name="payoutSchedule" defaultValue={profile?.payoutSchedule ?? ""} placeholder="2 раза в месяц, 5-е и 20-е" />
              </label>
            </div>
            <label className="mt-2 block">
              <span className="form-label">Штрафы и удержания — по одному на строку, честно</span>
              <textarea className="form-textarea mt-1 min-h-[80px]" name="penalties" defaultValue={penaltiesText} placeholder={"Опоздание до 15 минут — без штрафа\nПорча оборудования — компенсация по факту ремонта"} />
            </label>
          </div>

          <div className="border-b border-zinc-100 p-3 sm:p-4">
            <span className="form-label">Команда — без имён, только состав</span>
            <div className="mt-1 grid gap-x-4 gap-y-2 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs text-zinc-500">Администраторы</span>
                <input className="form-field mt-1 h-10" name="teamAdmins" type="number" min={0} max={200} defaultValue={team.admins ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Операторы</span>
                <input className="form-field mt-1 h-10" name="teamOperators" type="number" min={0} max={200} defaultValue={team.operators ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Женщины в команде</span>
                <input className="form-field mt-1 h-10" name="teamFemale" type="number" min={0} max={200} defaultValue={team.femaleCount ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500">Мужчины в команде</span>
                <input className="form-field mt-1 h-10" name="teamMale" type="number" min={0} max={200} defaultValue={team.maleCount ?? ""} />
              </label>
            </div>
            <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="hasTrainer" defaultChecked={team.hasTrainer ?? false} />
                <span className="text-sm text-zinc-700">Есть тренер моделей</span>
              </label>
              <input className="form-field h-10" name="trainerNote" defaultValue={team.trainerNote ?? ""} placeholder="Например: обучение первые 5 смен бесплатно" />
            </div>
          </div>
        </>
      )}

      {!isStudio && (
        <div className="border-b border-zinc-100 p-3 sm:p-4">
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <label className="block">
              <span className="form-label">Доля агентства, %</span>
              <input className="form-field mt-1 h-10" name="agencySharePercent" type="number" min={0} max={100} defaultValue={profile?.agencySharePercent ?? ""} placeholder="30" required />
            </label>
            <label className="block">
              <span className="form-label">Моделей в работе</span>
              <input className="form-field mt-1 h-10" name="modelsCount" type="number" min={0} defaultValue={profile?.modelsCount ?? ""} placeholder="23" />
            </label>
          </div>
          <div className="mt-2">
            <span className="form-label">Что входит в услугу</span>
            <CheckboxGroup name="agencyIncludes" options={agencyIncludeOptions} defaultValues={profile?.agencyIncludes ?? []} />
          </div>
        </div>
      )}

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
          <label className="block">
            <span className="form-label">Контакт для отклика</span>
            <input className="form-field mt-1 h-10" name="contactLink" defaultValue={profile?.contactLink ?? ""} placeholder="@telegram или email" required />
          </label>
          <label className="block">
            <span className="form-label">Telegram-канал</span>
            <input className="form-field mt-1 h-10" name="telegramLink" defaultValue={profile?.telegramLink ?? ""} placeholder="https://t.me/..." />
          </label>
          <label className="block">
            <span className="form-label">Сайт</span>
            <input className="form-field mt-1 h-10" name="websiteUrl" defaultValue={profile?.websiteUrl ?? ""} placeholder="https://..." />
          </label>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
        <p className="text-xs leading-5 text-zinc-500">
          Раздел заполняется организацией самостоятельно — редакция проверяет контакты и полноту, но не гарантирует достоверность условий.
        </p>
        <div className="sm:justify-self-end">
          <button className="btn btn-primary" type="submit">Сохранить</button>
        </div>
      </div>
    </form>
  );
}
