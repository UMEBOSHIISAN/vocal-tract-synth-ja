"""読経の録音から、声の高さ・倍音の強さ・切れ目を測る（numpy だけで動く）。

使い方:
  ffmpeg -i 録音.m4a -ac 1 -ar 22050 -f f32le a.f32
  python3 tools/chant_analysis.py a.f32 出力フォルダ

結果は JSON で標準出力へ。出力フォルダには途中の配列（.npy）を書く。
録音そのものはリポジトリに入れない。docs/kanshu-overtone-gin.md の実測はこれで出した。
"""
import numpy as np, sys, json
sr=22050
x=np.fromfile(sys.argv[1],dtype=np.float32); out=sys.argv[2]
N=2048; H=220
nf=(len(x)-N)//H
idx=np.arange(N)[None,:]+H*np.arange(nf)[:,None]
fr=x[idx]; rms=np.sqrt((fr**2).mean(1)); db=20*np.log10(rms+1e-9)
thr=np.percentile(db,95)-30
w=np.hanning(N)
# F0: autocorrelation via FFT
F=np.fft.rfft(fr*w,2*N); ac=np.fft.irfft(np.abs(F)**2)[:, :N]
ac/=ac[:, :1]+1e-12
lo,hi=int(sr/300),int(sr/55)
lag=lo+np.argmax(ac[:,lo:hi],1); pk=ac[np.arange(nf),lag]
# parabolic refine
a,b,c=ac[np.arange(nf),lag-1],pk,ac[np.arange(nf),lag+1]
lagr=lag+0.5*(a-c)/(a-2*b+c+1e-12)
f0=sr/lagr; voiced=(pk>0.6)&(db>thr)
t=np.arange(nf)*H/sr
fv=f0[voiced]; med=np.median(fv)
# octave error guard
ok=voiced&(f0>med*0.7)&(f0<med*1.45)
fv=f0[ok]; cents=1200*np.log2(fv/med)
res={}
res['duration']=len(x)/sr
res['voiced_sec']=float(ok.sum()*H/sr)
res['voice_span']=[float(t[ok][0]),float(t[ok][-1])]
res['f0_median']=float(med); res['f0_p5_p95']=[float(np.percentile(fv,5)),float(np.percentile(fv,95))]
res['cents_std']=float(cents.std()); res['cents_iqr']=float(np.percentile(cents,75)-np.percentile(cents,25))
# drift per 20s
res['f0_by_20s']=[[int(s),round(float(np.median(f0[ok&(t>=s)&(t<s+20)])),1)] for s in range(0,int(t[-1]),20) if (ok&(t>=s)&(t<s+20)).sum()>50]
# short-term jitter: std of cents within 0.5s windows
loc=[]
for s in np.arange(0,t[-1],0.5):
    m=ok&(t>=s)&(t<s+0.5)
    if m.sum()>30: loc.append(np.std(1200*np.log2(f0[m]/np.median(f0[m]))))
res['cents_std_within_0.5s_median']=float(np.median(loc))
# harmonics
N2=4096; nf2=(len(x)-N2)//H; w2=np.hanning(N2)
K=40; frq=np.fft.rfftfreq(N2,1/sr)
hsum=np.zeros(K); cnt=0; prom_hist=np.zeros(K); promvals=[]; best=[]
sel=[i for i in range(0,min(nf,nf2),3) if ok[i]]
ltas=np.zeros(len(frq))
for i in sel:
    seg=x[i*H:i*H+N2]*w2; sp=np.abs(np.fft.rfft(seg)); ltas+=sp**2
    f=f0[i]; amp=np.zeros(K)
    for k in range(1,K+1):
        c=k*f
        if c>sr/2-100: break
        j0=np.searchsorted(frq,c*0.97); j1=np.searchsorted(frq,c*1.03)+1
        amp[k-1]=sp[j0:j1].max()
    adb=20*np.log10(amp+1e-9); hsum+=adb; cnt+=1
    # prominence vs neighbours (k±1,±2) for harmonics in 500–4000Hz
    ks=[k for k in range(3,K-2) if 500<k*f<4000]
    pr={k:adb[k-1]-np.mean([adb[k-3],adb[k-2],adb[k],adb[k+1]]) for k in ks}
    kb=max(pr,key=pr.get); best.append((t[i],kb,kb*f,pr[kb],adb[kb-1]-adb.max()))
hm=hsum/cnt
res['harm_mean_db_rel']=[round(float(v-hm.max()),1) for v in hm[:32]]
best=np.array(best)
strong=best[best[:,3]>12]
res['frames']=len(best); res['frames_prom_gt12dB']=int(len(strong)); 
res['frames_prom_gt18dB']=int((best[:,3]>18).sum())
res['prom_percentiles_db']=[float(np.percentile(best[:,3],p)) for p in (50,75,90,99)]
if len(strong):
    h,e=np.histogram(strong[:,2],bins=np.arange(500,4100,250))
    res['strong_freq_hist']=[[int(e[i]),int(h[i])] for i in range(len(h))]
    res['strong_rel_to_loudest_db_median']=float(np.median(strong[:,4]))
np.save(out+'/best.npy',best); np.save(out+'/f0.npy',np.c_[t,f0,ok,db])
np.save(out+'/ltas.npy',np.c_[frq,10*np.log10(ltas/cnt+1e-12)])
# onsets: spectral flux on 23ms frames
N3=512;H3=110; nf3=(len(x)-N3)//H3
ix=np.arange(N3)[None,:]+H3*np.arange(nf3)[:,None]
M=np.log1p(50*np.abs(np.fft.rfft(x[ix]*np.hanning(N3))))
fl=np.maximum(M[1:]-M[:-1],0).sum(1); k=np.ones(5)/5; fl=np.convolve(fl,k,'same')
base=np.convolve(fl,np.ones(81)/81,'same'); d=fl-1.3*base
pkidx=[i for i in range(2,len(d)-2) if d[i]>0 and d[i]==d[max(0,i-12):i+13].max() and fl[i]>np.percentile(fl,60)]
ot=np.array(pkidx)*H3/sr; res['onsets']=len(ot)
ioi=np.diff(ot); ioi=ioi[ioi<1.5]; res['ioi_median']=float(np.median(ioi)); res['ioi_p25_p75']=[float(np.percentile(ioi,25)),float(np.percentile(ioi,75))]
np.save(out+'/onsets.npy',ot)
# pauses (breaths): unvoiced/quiet gaps >0.35s
q=db<thr; gaps=[]; s=None
for i in range(nf):
    if q[i] and s is None: s=i
    if (not q[i]) and s is not None:
        if (i-s)*H/sr>0.35: gaps.append((round(float(t[s]),1),round(float((i-s)*H/sr),2)))
        s=None
res['pauses']=gaps
print(json.dumps(res,ensure_ascii=False,indent=1))
