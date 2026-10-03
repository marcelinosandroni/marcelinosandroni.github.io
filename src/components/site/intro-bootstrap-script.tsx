/**
 * Holds the site back until the intro has decided whether it is playing.
 *
 * ## The bug this exists to kill
 *
 * `FirstVisitIntro` is a client component. On the server it has no idea whether
 * this reader has been here before — that answer lives in `localStorage` — so it
 * returns `null`, and the browser paints the finished site. Hydration runs, the
 * effect discovers this is a first visit, and *then* the intro mounts.
 *
 * In practice that gap is a few milliseconds on a fast machine and long enough to
 * notice on a slow phone: the reader sees the site, then a black curtain slams
 * over it, then the curtain does its four beats and leaves. The arrival reads as
 * a glitch rather than as an arrival, and it is the first thing anyone sees.
 *
 * React cannot fix this from the component, because the component has already
 * rendered by the time it knows. The only place early enough is the document head,
 * before the first paint.
 *
 * ## What it actually does
 *
 * One synchronous read of the same two localStorage values the component reads,
 * and one attribute on `<html>` when the answer is "play". CSS then holds the page
 * body invisible until the intro clears it.
 *
 * It is deliberately a *hold*, not a *hide*. The markup is rendered, the fonts are
 * requested and the poster is already downloading while the site is invisible —
 * which is what makes the hand-off instant once the intro lifts. Nothing is
 * deferred; only the paint is deferred.
 *
 * ## What it will not do
 *
 * It never leaves the site hidden. The ceiling below is the same belt-and-braces
 * the intro carries, for the case where hydration never completes: if this script
 * runs and nothing ever removes the attribute, the page becomes visible anyway
 * after a few seconds. A page that shows up late is an embarrassment; a page that
 * never shows up is a bug somebody files.
 */
import { INTRO_STORAGE_KEY, INTRO_TOTAL_MS } from "@/domain/intro";
import { SUPPORTED_LOCALE_SEGMENTS } from "@/domain/i18n";

/**
 * How long the hold lasts before it gives up on the intro entirely.
 *
 * Generous against the timeline rather than exact: the intro lifts the hold the
 * moment it starts, so this number is only ever read by the failure path. It is
 * the intro's own total plus two seconds of slack for a slow first compile.
 */
const HOLD_CEILING_MS = INTRO_TOTAL_MS + 2_000;

/** The attribute CSS keys off. Its presence means "the site is not ready to paint". */
export const INTRO_PENDING_ATTRIBUTE = "data-intro-pending";

/**
 * The pre-paint script, as source.
 *
 * Exported for the test that keeps it honest: the eligibility rules live in
 * `@/domain/intro` and are tested there, so what matters here is that this
 * inlined copy reaches the *same* verdict. A test asserts the embedded constants
 * match their sources, in the same spirit as `themeBootstrapSource`.
 */
export const introBootstrapSource = `(function(){
  var KEY=${JSON.stringify(INTRO_STORAGE_KEY)};
  var PENDING=${JSON.stringify(INTRO_PENDING_ATTRIBUTE)};
  var SEGMENTS=${JSON.stringify(SUPPORTED_LOCALE_SEGMENTS)};
  var IDLE=${JSON.stringify(10 * 60 * 1_000)};
  var CEILING=${HOLD_CEILING_MS};
  var root=document.documentElement;
  function release(){root.removeAttribute(PENDING);}
  try {
    // The intro only exists on a home route, and a reader on /en-us/resume has no
    // curtain coming. Holding the document for them would delay a page that is
    // already finished.
    var path=location.pathname.replace(/\\/+$/,"");
    var parts=path.split("/").filter(function(p){return p.length>0;});
    var isHome=parts.length===0||(parts.length===1&&SEGMENTS.indexOf(parts[0])!==-1);
    if(!isHome){return;}

    // Same gate as the component, asked before paint rather than after it.
    if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){return;}

    var raw=localStorage.getItem(KEY);
    if(raw!==null){
      var rec=null;
      try{rec=JSON.parse(raw);}catch(e){rec=null;}
      if(rec&&typeof rec.seenAt==="number"){
        var last=(typeof rec.lastActiveAt==="number")?rec.lastActiveAt:rec.seenAt;
        if(Date.now()-last<IDLE){return;}
      }
    }

    root.setAttribute(PENDING,"");
    // The fail-safe. Nothing in the normal path reaches this.
    window.setTimeout(release,CEILING);
    window.msdIntroRelease=release;
  } catch(e) {
    // Blocked storage, a locked-down browser, anything. The site shows.
  }
})();`;

/**
 * The script as a React element.
 *
 * `dangerouslySetInnerHTML` because there is no other way to run JavaScript before
 * the first paint. The only interpolations are `JSON.stringify` of domain
 * constants and one derived number, so there is no injection surface — the same
 * argument `ThemeBootstrapScript` makes.
 */
export function IntroBootstrapScript(): React.ReactElement {
  return <script dangerouslySetInnerHTML={{ __html: introBootstrapSource }} />;
}

/**
 * Called by the intro the moment it starts playing.
 *
 * The attribute and the timer live on `window` because the script above runs
 * outside React entirely; this is the hand-off back into the component's world.
 * Safe to call unconditionally — if the hold was never raised, there is nothing
 * to release and the timer never existed.
 */
export function releaseIntroHold(): void {
  if (typeof window === "undefined") {
    return;
  }

  const pending = (window as { msdIntroRelease?: () => void }).msdIntroRelease;

  if (typeof pending === "function") {
    pending();
    delete (window as { msdIntroRelease?: () => void }).msdIntroRelease;
  }
}