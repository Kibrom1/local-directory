/* Minimal progressive enhancement. Pages work without it. ~1 KB of logic per feature. */
document.documentElement.classList.add('js');
(function(){
  var t=document.querySelector('.nav-toggle'),l=document.getElementById('nav-list');
  if(t&&l){t.addEventListener('click',function(){var o=l.classList.toggle('open');t.setAttribute('aria-expanded',o)});}
  /* city results filter */
  var f=document.getElementById('filters');
  if(f){
    var rows=[].slice.call(document.querySelectorAll('[data-types]')),cnt=document.getElementById('count'),empty=document.getElementById('empty-state');
    var apply=function(){
      var pt=f.elements.type.value,fe=f.elements.fees.checked,n=0;
      rows.forEach(function(r){
        var ok=(!pt||r.dataset.types.split(' ').indexOf(pt)>-1)&&(!fe||r.dataset.fees==='yes');
        r.hidden=!ok;if(ok)n++;
      });
      cnt.textContent=n+(n===1?' company':' companies')+' shown';
      if(empty)empty.hidden=n>0;
    };
    f.addEventListener('change',apply);f.addEventListener('submit',function(e){e.preventDefault();apply()});
    var q=new URLSearchParams(location.search).get('type');if(q){f.elements.type.value=q;}
    apply();
  }
  /* fee table: compare + rent illustration */
  var tb=document.getElementById('fee-table');
  if(tb){
    var boxes=[].slice.call(tb.querySelectorAll('input[type=checkbox]')),msg=document.getElementById('compare-msg'),show=document.getElementById('show-selected'),reset=document.getElementById('show-all');
    var rent=document.getElementById('rent'),out=[].slice.call(tb.querySelectorAll('[data-est]'));
    var fmt=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
    var est=function(){
      var r=parseFloat(rent.value);
      out.forEach(function(el){
        var d=el.dataset;
        if(!r||r<=0){el.textContent='Enter rent above';return}
        if(d.pctLo){var lo=r*d.pctLo/100,hi=r*d.pctHi/100;el.textContent=(lo===hi?fmt(lo):fmt(lo)+' to '+fmt(hi))+' / mo'}
        else if(d.flatLo){el.textContent=(d.flatLo===d.flatHi?fmt(+d.flatLo):fmt(+d.flatLo)+' to '+fmt(+d.flatHi))+' / mo'}
        else el.textContent='Not enough published data';
      });
    };
    if(rent){rent.addEventListener('input',est);est();}
    var upd=function(){
      var n=boxes.filter(function(b){return b.checked}).length;
      if(n>3){this.checked=false;n=3;msg.textContent='You can compare up to 3 companies. Uncheck one first.';}
      else msg.textContent=n+' selected (choose 2 or 3).';
      show.disabled=n<2;show.setAttribute('aria-disabled',n<2);
    };
    boxes.forEach(function(b){b.addEventListener('change',upd)});
    show.addEventListener('click',function(){
      tb.querySelectorAll('tbody tr').forEach(function(r){var b=r.querySelector('input');r.hidden=!(b&&b.checked)});
      reset.hidden=false;msg.textContent='Showing only your selected companies.';
    });
    reset.addEventListener('click',function(){tb.querySelectorAll('tbody tr').forEach(function(r){r.hidden=false});reset.hidden=true;msg.textContent='Showing all companies.'});
  }
  /* corrections: prefill from query string; show/hide fields by request type */
  var cf=document.getElementById('correct-form');
  if(cf){
    var p=new URLSearchParams(location.search);
    if(p.get('type')&&cf.elements.rtype){[].forEach.call(cf.elements.rtype,function(r){if(r.value===p.get('type'))r.checked=true})}
    if(p.get('company'))cf.elements.company.value=p.get('company');
    var sync=function(){var v=cf.elements.rtype.value;document.getElementById('fact-fields').hidden=(v==='remove')};
    cf.addEventListener('change',sync);sync();
    cf.addEventListener('submit',function(e){
      e.preventDefault();var bad=[];
      ['company','requester_email','evidence'].forEach(function(n){
        var el=cf.elements[n],er=document.getElementById(n+'-err');
        var need=n!=='evidence'||cf.elements.rtype.value!=='remove';
        var ok=!need||(el.value.trim()&&el.checkValidity());
        if(er){er.hidden=ok}el.setAttribute('aria-invalid',!ok);if(!ok)bad.push(el);
      });
      var sum=document.getElementById('error-summary');
      if(bad.length){sum.hidden=false;sum.focus();return}
      sum.hidden=true;document.getElementById('thanks').hidden=false;cf.hidden=true;document.getElementById('thanks').focus();
    });
  }
})();
